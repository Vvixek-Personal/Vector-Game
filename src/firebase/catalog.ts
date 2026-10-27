import { useSyncExternalStore } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./config";
import { STORE_ITEMS, type StoreItem } from "../game/catalog";
import { FRAMES, BANNERS, TITLES } from "../game/profile";
import { safeStorage } from "../game/persistence";

// Keep base prices separate from the rotating weekly offer and remote overrides.
const builtins = STORE_ITEMS.map((item) => {
  const copy = structuredClone(item);
  if (copy.desc.startsWith("✨ 30% OFF WEEKLY FEATURE: ")) {
    copy.cost = copy.originalCost!;
    delete copy.originalCost;
    delete copy.salePercent;
    delete copy.isSale;
    copy.desc = copy.desc.replace("✨ 30% OFF WEEKLY FEATURE: ", "");
  }
  return copy;
});

const loadCachedOverrides = (): StoreItem[] => {
  try {
    const raw = safeStorage.getItem("vector_catalog_overrides");
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

let overrides: StoreItem[] = loadCachedOverrides();
let week = -1;
let version = 0;
let users = 0;

const listeners = new Set<()=>void>();
let stop: (() => void) | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

export function useCatalog() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => version,
    () => version
  );
}

export function applyCatalogItem(item: StoreItem) {
  const index = overrides.findIndex((o) => o.id === item.id);
  if (index >= 0) {
    overrides[index] = { ...overrides[index], ...item };
  } else {
    overrides.push(item);
  }
  try {
    safeStorage.setItem("vector_catalog_overrides", JSON.stringify(overrides));
  } catch {}
  rebuild();
}

function rebuild() {
  week = Math.floor(Date.now() / 604800000);
  const merged = new Map(builtins.map((item) => [item.id, structuredClone(item)]));
  const diamonds = [...merged.values()].filter((item) => item.currency === "diamonds" && !item.pack);
  if (diamonds.length) {
    const featured = diamonds[week % diamonds.length];
    featured.originalCost = featured.cost;
    featured.cost = Math.floor(featured.cost * 0.7);
    featured.isSale = true;
    featured.salePercent = 30;
    featured.desc = "✨ 30% OFF WEEKLY FEATURE: " + featured.desc;
  }
  for (const item of overrides) {
    merged.set(item.id, { ...merged.get(item.id), ...item });
  }
  STORE_ITEMS.splice(0, STORE_ITEMS.length, ...merged.values());
  for (const item of STORE_ITEMS) {
    if (item.apply?.frameId && item.frameCss) {
      const def = {
        id: item.apply.frameId,
        name: item.name,
        css: item.frameCss,
        rule: () => ({ met: false, label: "Store item", progress: "Store" }),
      };
      const i = FRAMES.findIndex((v) => v.id === def.id);
      if (i >= 0) FRAMES[i] = { ...FRAMES[i], name: def.name, css: def.css };
      else FRAMES.push(def);
    }
    if (item.apply?.bannerId && item.preview) {
      const def = {
        id: item.apply.bannerId,
        name: item.name,
        css: item.preview,
        dark: true,
        rule: () => ({ met: false, label: "Store item", progress: "Store" }),
      };
      const i = BANNERS.findIndex((v) => v.id === def.id);
      if (i < 0) BANNERS.push(def);
      else BANNERS[i] = { ...BANNERS[i], name: def.name, css: def.css };
    }
    if (item.apply?.titleId) {
      const i = TITLES.findIndex((v) => v.id === item.apply.titleId);
      if (i < 0) TITLES.push({ id: item.apply.titleId, name: item.name, rule: () => ({ met: false, label: "Store item", progress: "Store" }) });
      else TITLES[i] = { ...TITLES[i], name: item.name };
    }
  }
  version++;
  for (const fn of listeners) fn();
}

export function startCatalogSync() {
  users++;
  if (!stop) {
    rebuild();
    stop = onSnapshot(
      collection(db, "catalog"),
      (snapshot) => {
        overrides = snapshot.docs.flatMap((document) => {
          const data = document.data();
          return typeof data.name === "string" && Number.isSafeInteger(data.cost) && data.cost >= 0
            ? [{ ...data, id: document.id } as StoreItem]
            : [];
        });
        try {
          safeStorage.setItem("vector_catalog_overrides", JSON.stringify(overrides));
        } catch {}
        rebuild();
      },
      () => {
        /* Bundled catalog stays available offline. */
      }
    );
    timer = setInterval(() => {
      if (week !== Math.floor(Date.now() / 604800000)) rebuild();
    }, 60000);
  }
  return () => {
    users--;
    if (!users) {
      stop?.();
      stop = null;
      if (timer) clearInterval(timer);
      timer = null;
    }
  };
}
