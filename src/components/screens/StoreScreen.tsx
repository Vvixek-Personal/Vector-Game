import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { STORE_ITEMS, itemsFor, priceLabel, type StoreItem, type StoreTab } from "../../game/catalog";
import { convertSparksToDiamonds, spendDiamonds, spendSparks, type Stats } from "../../game/storage";
import { uiConfirm, uiTap, uiUnlock } from "../../game/haptics";
import type { Profile } from "../../game/profile";
import { Sparkles, Gem, X, Flame, Check, Disc, Egg, Sparkle, Compass, User, Palette, Waves } from "lucide-react";
import CartoonAvatar from "../CartoonAvatar";
import AnimeAvatar from "../AnimeAvatar";
import { LuckySpinView } from "../store/LuckySpinView";
import { DURATION, EASE, backdropVariants, panelVariants } from "../../utils/motion";
import { IncubatorView } from "../store/IncubatorView";
import AppHeader from "../AppHeader";
import TiltCard from "../TiltCard";

interface Props {
  stats: Stats;
  onStats: (s: Stats) => void;
  profile: Profile;
  onProfile: (p: Profile) => void;
}

type MainCategory = "cosmetics" | "atmosphere" | "activities" | "vault";

interface MainCategoryDef {
  id: MainCategory;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  defaultTab: StoreTab;
  subTabs: { id: StoreTab; label: string }[];
}

const CATEGORIES: MainCategoryDef[] = [
  {
    id: "cosmetics",
    label: "Cosmetics",
    icon: User,
    defaultTab: "avatars",
    subTabs: [
      { id: "avatars", label: "Avatars" },
      { id: "frames", label: "Frames" },
      { id: "titles", label: "Titles" },
      { id: "banners", label: "Banners" },
      { id: "styles", label: "Styles" },
    ],
  },
  {
    id: "atmosphere",
    label: "Atmosphere",
    icon: Palette,
    defaultTab: "themes",
    subTabs: [
      { id: "themes", label: "Arena Themes" },
      { id: "audio", label: "Audio Packs" },
    ],
  },
  {
    id: "activities",
    label: "Activities",
    icon: Disc,
    defaultTab: "spin",
    subTabs: [
      { id: "spin", label: "Lucky Spin" },
      { id: "incubator", label: "Incubator" },
    ],
  },
  {
    id: "vault",
    label: "Vault",
    icon: Gem,
    defaultTab: "diamonds",
    subTabs: [{ id: "diamonds", label: "Exchange" }],
  },
];

function PreviewFace({ item, isModal = false }: { item: StoreItem; isModal?: boolean }) {
  const avatarSize = isModal ? 136 : 110;
  if (item.anime) {
    return (
      <div className={`store-photo anime-wrap ${isModal ? "h-[140px] flex items-center justify-center" : ""}`}>
        <AnimeAvatar id={item.anime} size={avatarSize} />
      </div>
    );
  }
  if (item.cartoon) {
    return (
      <div className={`store-photo cartoon-wrap ${isModal ? "h-[140px] flex items-center justify-center" : ""}`}>
        <CartoonAvatar id={item.cartoon} size={avatarSize} />
      </div>
    );
  }
  if (item.themeSwatch) {
    return (
      <div
        className="theme-preview w-full"
        style={{
          background: `linear-gradient(180deg, ${item.themeSwatch[1]}, ${item.themeSwatch[2]})`,
          height: isModal ? 110 : 88,
        }}
      >
        <span className="theme-arrow" style={{ color: item.themeSwatch[0], fontSize: isModal ? 38 : 28 }}>
          ➤
        </span>
      </div>
    );
  }
  if (item.frameCss) {
    return (
      <div className="frame-preview w-full" style={{ height: isModal ? 110 : 88 }}>
        <span
          style={{
            boxShadow: item.frameCss,
            width: isModal ? 68 : 52,
            height: isModal ? 68 : 52,
            fontSize: isModal ? 22 : 16,
          }}
        >
          V
        </span>
      </div>
    );
  }
  if (item.pattern) {
    return (
      <div
        className="style-preview w-full"
        style={{
          background: item.preview || "linear-gradient(120deg,#2b3350,#7a4a6e)",
          height: isModal ? 110 : 88,
        }}
      >
        <span className="profile-hero-pattern" data-pattern={item.pattern} />
        <em style={{ fontSize: isModal ? 14 : 12 }}>{item.name}</em>
      </div>
    );
  }
  if (item.tab === "titles") {
    return (
      <div
        className="title-preview w-full"
        style={{
          height: isModal ? 100 : 88,
          fontSize: isModal ? 22 : 18,
        }}
      >
        <span>{item.name}</span>
      </div>
    );
  }
  if (item.preview) {
    return (
      <div
        className="store-swatch w-full"
        style={{
          background: item.preview,
          height: isModal ? 100 : 72,
        }}
      />
    );
  }
  if (item.pack) {
    return (
      <div
        className="store-swatch store-swatch-plain diamond-face w-full"
        style={{
          height: isModal ? 100 : 72,
          fontSize: isModal ? 28 : 22,
        }}
      >
        <Gem size={isModal ? 28 : 22} className="inline-icon" /> {item.pack.diamonds}
      </div>
    );
  }
  return (
    <div className="store-swatch store-swatch-plain w-full" style={{ height: isModal ? 100 : 72 }}>
      {item.name[0]}
    </div>
  );
}

export default function StoreScreen({ stats, onStats, profile, onProfile }: Props) {
  const [category, setCategory] = useState<MainCategory>("cosmetics");
  const [tab, setTab] = useState<StoreTab>("avatars");
  const [note, setNote] = useState("");
  const [peek, setPeek] = useState<StoreItem | null>(null);

  const items = useMemo(() => itemsFor(tab), [tab]);
  const sparks = stats.sparks ?? 0;
  const diamonds = stats.diamonds ?? 0;

  // Sync category if tab changed externally
  useEffect(() => {
    const parent = CATEGORIES.find((c) => c.subTabs.some((st) => st.id === tab));
    if (parent && parent.id !== category) {
      setCategory(parent.id);
    }
  }, [tab, category]);

  useEffect(() => {
    if (!peek) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPeek(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [peek]);

  const owned = (item: StoreItem) => {
    if (item.pack) return false;
    return profile.purchased.includes(item.id);
  };

  const canAfford = (item: StoreItem) =>
    item.currency === "diamonds" ? diamonds >= item.cost : sparks >= item.cost;

  const buy = (item: StoreItem) => {
    if (!item.pack && profile.purchased.includes(item.id)) {
      uiTap();
      onProfile({ ...profile, ...(item.apply as Partial<Profile>) });
      setNote(`Equipped ${item.name}.`);
      setPeek(null);
      return;
    }
    let next: Stats | null = null;
    if (item.pack?.diamonds) {
      next = convertSparksToDiamonds(item.cost, item.pack.diamonds);
    } else if (item.currency === "diamonds") {
      next = spendDiamonds(item.cost);
    } else {
      next = spendSparks(item.cost);
    }
    if (!next) {
      setNote(item.currency === "diamonds" ? `Need ${item.cost} Diamonds.` : `Need ${item.cost.toLocaleString()} Sparks.`);
      return;
    }
    uiUnlock();
    onStats(next);
    if (item.pack) {
      setNote(`+${item.pack.diamonds} Diamonds.`);
    } else {
      onProfile({ ...profile, purchased: [...profile.purchased, item.id], ...(item.apply as Partial<Profile>) });
      setNote(`Bought ${item.name}.`);
    }
    setPeek(null);
  };

  const activeCategoryDef = CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[0];

  return (
    <div className="store-page max-w-[1140px] mx-auto px-4 sm:px-6 pb-28">
      {/* Unified clean header with integrated Spark and Diamond balances */}
      <AppHeader
        title="Store"
        subtitle="Exclusive looks, audio & vault exchange"
        sparks={sparks}
        diamonds={diamonds}
      />

      <div className="mt-4 flex flex-col gap-4">
        {/* Curated Main Categories Segmented Switcher */}
        <div
          className="flex items-center gap-1 p-1 rounded-2xl border"
          style={{
            background: "var(--surface)",
            borderColor: "var(--panel-border)",
          }}
          role="tablist"
          aria-label="Store departments"
        >
          {CATEGORIES.map((cat) => {
            const isActive = category === cat.id;
            const IconComp = cat.icon;
            return (
              <button
                key={cat.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  uiTap();
                  setCategory(cat.id);
                  setTab(cat.defaultTab);
                  setNote("");
                }}
                className="relative flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-[13px] font-semibold transition-colors duration-150"
                style={{
                  color: isActive ? "var(--text)" : "var(--text-dim)",
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="storeMainCatActive"
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: "var(--pill)",
                      border: "1px solid var(--selected-border)",
                    }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <IconComp size={15} />
                  <span>{cat.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Sub-tabs for the active category (clean unboxed text navigation) */}
        {activeCategoryDef.subTabs.length > 1 && (
          <div
            className="flex items-center gap-2 px-1 overflow-x-auto pb-1"
            role="tablist"
            aria-label="Sub-categories"
          >
            {activeCategoryDef.subTabs.map((sub, i) => {
              const isSubActive = tab === sub.id;
              const count = STORE_ITEMS.filter((item) => item.tab === sub.id).length;
              return (
                <div key={sub.id} className="flex items-center gap-2 shrink-0">
                  {i > 0 && (
                    <span className="text-[11px] select-none opacity-30" aria-hidden="true">
                      ·
                    </span>
                  )}
                  <button
                    role="tab"
                    aria-selected={isSubActive}
                    onClick={() => {
                      uiTap();
                      setTab(sub.id);
                      setNote("");
                    }}
                    className={`text-[13px] font-medium transition-colors py-1 px-2.5 rounded-lg ${
                      isSubActive ? "font-semibold txt bg-[var(--surface-raised)]" : "text-[var(--text-dim)] hover:text-[var(--text)]"
                    }`}
                  >
                    <span>{sub.label}</span>
                    {count > 0 && <span className="ml-1.5 opacity-60 text-[11px] num">({count})</span>}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Content View with Spring Morph */}
        <AnimatePresence mode="wait">
          {tab === "spin" ? (
            <motion.div
              key="tab-spin"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.99 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
            >
              <LuckySpinView
                stats={stats}
                onStats={onStats}
                profile={profile}
                onProfile={onProfile}
                onMessage={setNote}
              />
            </motion.div>
          ) : tab === "incubator" ? (
            <motion.div
              key="tab-incubator"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.99 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
            >
              <IncubatorView
                stats={stats}
                onStats={onStats}
                profile={profile}
                onProfile={onProfile}
                onMessage={setNote}
              />
            </motion.div>
          ) : (
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 mt-2"
            >
              {items.map((item, idx) => {
                const have = owned(item);
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 350,
                      damping: 26,
                      delay: Math.min(0.12, idx * 0.015),
                    }}
                  >
                    <TiltCard
                      maxTilt={9}
                      scale={1.02}
                      onClick={() => {
                        uiTap();
                        setPeek(item);
                      }}
                      className={`cursor-pointer rounded-2xl border p-3.5 flex flex-col justify-between h-full transition-shadow duration-200 glass ${
                        have ? "border-[var(--brand)]/40" : "border-[var(--panel-border)]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider mb-2">
                          <span
                            className="rounded-md px-1.5 py-0.5"
                            style={{
                              background: "var(--surface)",
                              color:
                                item.rarity === "ultra"
                                  ? "#f43f5e"
                                  : item.rarity === "epic"
                                    ? "#a855f7"
                                    : item.rarity === "rare"
                                      ? "#38bdf8"
                                      : "var(--text-dim)",
                            }}
                          >
                            {item.rarity ?? "common"}
                          </span>
                          {item.isNew && (
                            <span className="text-amber-400 flex items-center gap-1 font-semibold">
                              <Sparkles size={11} /> New
                            </span>
                          )}
                          {item.isSale && (
                            <span className="text-rose-400 flex items-center gap-0.5 font-semibold">
                              <Flame size={11} /> -{item.salePercent}%
                            </span>
                          )}
                        </div>

                        <div className="rounded-xl overflow-hidden my-1 flex items-center justify-center min-h-[78px]">
                          <PreviewFace item={item} />
                        </div>

                        <h3 className="font-semibold text-[13px] tracking-tight mt-2 txt truncate">
                          {item.name}
                        </h3>
                        <p className="t-caption text-[11px] line-clamp-2 mt-0.5 leading-snug">
                          {item.desc}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-[var(--panel-border)]/50 flex items-center justify-between">
                        {have ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                            <Check size={13} /> Owned
                          </span>
                        ) : (
                          <span className="num font-semibold text-[12px]">{priceLabel(item, "md")}</span>
                        )}
                        <span className="text-[11px] font-medium text-[var(--brand)] opacity-80">
                          {have ? "Equip" : "Inspect"}
                        </span>
                      </div>
                    </TiltCard>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {note && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="settings-status mt-4"
          role="status"
        >
          {note}
        </motion.p>
      )}

      {/* Screen Modal Popup mounted via Portal with 3D Preview Stage */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {peek && (
              <motion.div
                key="store-peek-modal"
                variants={backdropVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="store-modal-overlay surface-backdrop"
                role="dialog"
                aria-modal="true"
                aria-label={`Preview ${peek.name}`}
                onClick={() => setPeek(null)}
              >
                <motion.div
                  variants={panelVariants}
                  className="store-modal-card surface-card max-w-[390px] p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Close X button */}
                  <button
                    className="store-modal-close"
                    onClick={() => setPeek(null)}
                    aria-label="Close preview"
                  >
                    <X size={16} />
                  </button>

                  {/* Promotional banner if New or Sale */}
                  {peek.isNew && (
                    <div className="modal-promo-banner promo-new">
                      <Sparkles size={14} />
                      <span>New in store</span>
                    </div>
                  )}
                  {peek.isSale && (
                    <div className="modal-promo-banner promo-sale">
                      <Flame size={14} />
                      <span>{peek.salePercent}% off this week</span>
                    </div>
                  )}

                  {/* Preview Stage with 3D Tilt */}
                  <TiltCard maxTilt={12} scale={1.03} className="store-modal-preview-stage rounded-2xl my-3">
                    <PreviewFace item={peek} isModal={true} />
                  </TiltCard>

                  <div>
                    <h3 className="t-title text-[18px] font-bold">{peek.name}</h3>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={`store-badge badge-rarity ${peek.rarity ?? "common"}`}>
                        {peek.rarity ?? "common"}
                      </span>
                      <span className="t-caption">
                        {peek.currency === "diamonds" ? "Diamonds collection" : "Sparks collection"}
                      </span>
                    </div>
                  </div>

                  <p className="t-body mt-2 leading-relaxed">{peek.desc}</p>

                  {/* Big Price Presentation */}
                  <div className="store-modal-price-box my-3">
                    <span className="store-modal-price-box-label">Price</span>
                    <div className="flex items-center justify-between">
                      <div>{priceLabel(peek, "xl")}</div>
                      {owned(peek) && (
                        <span className="store-owned-badge">
                          <Check size={13} /> Owned
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="store-modal-actions">
                    <motion.button
                      whileTap={{ scale: 0.985 }}
                      className={`store-modal-btn-buy ${owned(peek) ? "equipped" : ""}`}
                      disabled={!owned(peek) && !canAfford(peek)}
                      onClick={() => {
                        uiConfirm();
                        buy(peek);
                      }}
                    >
                      {owned(peek) ? (
                        <>
                          <Check size={16} /> Equip
                        </>
                      ) : (
                        <>
                          <span>{canAfford(peek) ? "Buy" : "Not enough"}</span>
                          {priceLabel(peek, "md")}
                        </>
                      )}
                    </motion.button>
                    <button className="store-modal-btn-close" onClick={() => setPeek(null)}>
                      Close
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
