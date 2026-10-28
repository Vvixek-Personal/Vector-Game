import { useMemo, useState, useRef } from "react";
import { Search, Heart, Sparkles, Gem, ArrowUpRight, Check, Disc, Egg, SlidersHorizontal, Layers, ShoppingBag, X } from "lucide-react";
import { STORE_ITEMS, type StoreItem, type StoreTab } from "../../game/catalog";
import { loadProfile, saveProfile, type Profile } from "../../game/profile";
import { loadName, type Stats } from "../../game/storage";
import { canAffordItem, filterStoreItems, isStoreItemEquipped, ownsStoreItem, type StoreFilters } from "../../game/store";
import { uiTap, uiUnlock } from "../../game/haptics";
import AppHeader from "../AppHeader";
import { requestStoreAction } from "../../game/economy";
import { useCatalog } from "../../firebase/catalog";
import Modal from "../shared/Modal";
import SegmentedTabs from "../shared/SegmentedTabs";
import { ItemArt, LoadoutPreview } from "../store/ItemPreview";
import { LuckySpinView } from "../store/LuckySpinView";
import { IncubatorView } from "../store/IncubatorView";
import "../../collection.css";

interface Props { stats: Stats; onStats: (stats: Stats) => void; profile: Profile; onProfile: (profile: Profile) => void }
type Section = "browse" | "collection" | "wishlist" | "activities" | "exchange";
const categories = [
  { id: "all", label: "All items" }, { id: "avatars", label: "Avatars" }, { id: "banners", label: "Banners" },
  { id: "frames", label: "Frames" }, { id: "themes", label: "Arena themes" }, { id: "styles", label: "Patterns" },
  { id: "titles", label: "Titles" }, { id: "audio", label: "Audio" },
];
const initialFilters: StoreFilters = { view: "browse", tab: "all", query: "", currency: "all", rarity: "all", affordable: false, sort: "featured" };


function Price({ item }: { item: StoreItem }) {
  return <span className={"v-price " + item.currency}>
    {item.originalCost && item.originalCost > item.cost ? <s>{item.originalCost.toLocaleString()}</s> : null}
    {item.currency === "diamonds" ? <Gem size={14}/> : <Sparkles size={14}/>}
    <span>{item.cost.toLocaleString()}</span><span className="sr-only">{item.currency}</span>
  </span>;
}

export default function StoreScreen({ stats, onStats, profile, onProfile }: Props) {
  const catalogVersion=useCatalog();
  const collectibles=STORE_ITEMS.filter(item=>!item.pack);
  const [checkoutBusy,setCheckoutBusy]=useState(false);
  const checkout=useRef<{busy:boolean;itemId:string;id:string}>({busy:false,itemId:"",id:""});
  const [section, setSection] = useState<Section>("browse");
  const [activity, setActivity] = useState<"spin" | "incubator">("spin");
  const [filters, setFilters] = useState(initialFilters);
  const [peek, setPeek] = useState<StoreItem | null>(null);
  const [note, setNote] = useState("");
  const ownedCount = collectibles.filter(item => ownsStoreItem(item, profile, stats)).length;
  const wishCount = profile.wishlist?.length ?? 0;
  const isCatalog = ["browse", "collection", "wishlist"].includes(section);
  const visibleItems = useMemo(() => filterStoreItems(collectibles, profile, stats, {
    ...filters, view: isCatalog ? section as StoreFilters["view"] : "browse",
  }), [filters, section, profile, stats, catalogVersion]);
  const patch = (value: Partial<StoreFilters>) => setFilters(previous => ({ ...previous, ...value }));
  const changeSection = (value: Section) => { uiTap(); setSection(value); };
  const openActivity = (value: "spin" | "incubator") => { setActivity(value); changeSection("activities"); };
  const toggleWish = (item: StoreItem) => {
    const current = loadProfile();
    const wished = current.wishlist?.includes(item.id);
    const next = { ...current, wishlist: wished ? current.wishlist.filter(id => id !== item.id) : [...(current.wishlist ?? []), item.id] };
    saveProfile(next); onProfile(next); uiTap();
    setNote(wished ? item.name + " removed from your wishlist." : item.name + " saved to your wishlist.");
  };
  const confirm = async (item: StoreItem) => {
    if(checkout.current.busy)return;
    if(checkout.current.itemId!==item.id)checkout.current={busy:false,itemId:item.id,id:crypto.randomUUID()};
    checkout.current.busy=true;setCheckoutBusy(true);
    const result = await requestStoreAction(item.id, ownsStoreItem(item, profile, stats) ? "equip" : "buy",checkout.current.id,{cost:item.cost,currency:item.currency});
    checkout.current.busy=false;setCheckoutBusy(false);
    if (result.ok === false) { setNote(result.reason);if(result.reason.toLowerCase().includes("price"))setPeek(STORE_ITEMS.find(current=>current.id===item.id)||item); return; }
    onStats(result.stats); onProfile(result.profile);
    if (result.kind === "equipped") uiTap(); else uiUnlock();
    setNote(result.kind === "exchanged" ? "+" + item.pack?.diamonds + " Diamonds added."
      : result.kind === "equipped" ? item.name + " equipped." : item.name + " unlocked and equipped.");
    setPeek(null);checkout.current={busy:false,itemId:"",id:""};
  };
  const peekOwned = peek ? ownsStoreItem(peek, profile, stats) : false;
  const peekEquipped = peek ? peekOwned && isStoreItemEquipped(peek, profile) : false;
  const remaining = peek ? Math.max(0, (peek.currency === "diamonds" ? stats.diamonds : stats.sparks) - peek.cost) : 0;
  const shortage = peek ? Math.max(0, peek.cost - (peek.currency === "diamonds" ? stats.diamonds : stats.sparks)) : 0;

  return <div className="collection-page">
    <AppHeader title="Store" subtitle="Looks and cosmetics" sparks={stats.sparks} diamonds={stats.diamonds}/>
    <section className="store-overview">
      <div><p className="v-eyebrow">THE COLLECTION</p><h1>Make it yours.</h1><p>Preview a new look and customize your arcade experience.</p><small>{ownedCount} / {collectibles.length} items available in your collection</small></div>
      <div className="store-shortcuts"><button onClick={()=>openActivity("spin")}><Disc size={18}/><span>Lucky Spin<small>Daily wheel & rewards</small></span><ArrowUpRight size={14}/></button><button onClick={()=>openActivity("incubator")}><Egg size={18}/><span>Incubator<small>Hatch your next find</small></span><ArrowUpRight size={14}/></button></div>
    </section>

    <SegmentedTabs label="Store sections" value={section} onChange={changeSection} panelId="store-content" className="v-primary-tabs" options={[
      { id: "browse", label: "Discover", icon: <ShoppingBag size={16}/> },
      { id: "collection", label: "My collection", icon: <Layers size={16}/>, count: ownedCount },
      { id: "wishlist", label: "Wishlist", icon: <Heart size={16}/>, count: wishCount },
      { id: "activities", label: "Activities", icon: <Disc size={16}/> },
      { id: "exchange", label: "Exchange", icon: <Gem size={16}/> },
    ]}/>
    <div className="v-notice" role="status" aria-live="polite">{note || "Cosmetics change your look and sound. Your scores stay skill based."}</div>

    <section id="store-content" role="tabpanel" aria-label={section === "browse" ? "Discover items" : section === "collection" ? "My collection" : section === "wishlist" ? "Wishlist" : section === "activities" ? "Store activities" : "Currency exchange"}>
      {isCatalog && <>
        <SegmentedTabs label="Item categories" value={filters.tab} onChange={value => patch({ tab: value })} panelId="store-grid-panel" className="v-category-tabs" options={categories}/>
        <div className="v-store-toolbar">
          <label className="v-search"><Search size={17}/><input aria-label="Search store" placeholder="Search your next favorite…" value={filters.query} onChange={event => patch({ query: event.target.value })}/>{filters.query && <button aria-label="Clear search" onClick={() => patch({ query: "" })}><X size={15}/></button>}</label>
          <label className="v-select"><span>Currency</span><select aria-label="Store currency" value={filters.currency} onChange={event => patch({ currency: event.target.value as StoreFilters["currency"] })}><option value="all">All currencies</option><option value="sparks">Sparks</option><option value="diamonds">Diamonds</option></select></label>
          <label className="v-select"><span>Rarity</span><select aria-label="Store rarity" value={filters.rarity} onChange={event => patch({ rarity: event.target.value as StoreFilters["rarity"] })}><option value="all">All rarities</option>{["common", "rare", "epic", "ultra"].map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select></label>
          <label className="v-select"><span>Sort by</span><select aria-label="Sort store" value={filters.sort} onChange={event => patch({ sort: event.target.value as StoreFilters["sort"] })}><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name: A to Z</option></select></label>
        </div>
        <div className="v-results-line"><span aria-live="polite"><b>{visibleItems.length}</b> {section === "wishlist" ? "saved" : section === "collection" ? "available" : "matching"} items{filters.sort.startsWith("price") ? " · Sparks, then Diamonds" : ""}</span>
          <label className="v-check"><input type="checkbox" checked={filters.affordable} onChange={event => patch({ affordable: event.target.checked })}/> Within my balance</label>
          <button className="v-text-button" onClick={() => setFilters(initialFilters)}><SlidersHorizontal size={13}/> Reset filters</button></div>
        <div id="store-grid-panel" role="tabpanel" aria-label="Store items">
          {visibleItems.length ? <div className="v-item-grid">{visibleItems.map(item => {
            const owned = ownsStoreItem(item, profile, stats);
            const equipped = owned && isStoreItemEquipped(item, profile);
            const wished = profile.wishlist?.includes(item.id) ?? false;
            return <article className={"v-item-card " + (equipped ? "is-equipped" : "")} key={item.id} data-store-item={item.id}>
              <div className="v-item-flags"><span className={"v-rarity rarity-" + (item.rarity ?? "common")}>{item.rarity ?? "common"}</span>
                <button className={"v-wish-button " + (wished ? "is-saved" : "")} aria-label={(wished ? "Remove " : "Save ") + item.name + (wished ? " from wishlist" : " to wishlist")} aria-pressed={wished} onClick={() => toggleWish(item)}><Heart size={16} fill={wished ? "currentColor" : "none"}/></button></div>
              <button className="v-item-art" onClick={() => { uiTap(); setPeek(item); }} aria-label={"Preview " + item.name}><ItemArt item={item}/></button>
              <div className="v-item-info"><div className="v-item-title"><h3>{item.name}</h3>{item.isNew && <span className="v-new">NEW</span>}</div><p>{item.desc.replace(/^✨ 30% OFF WEEKLY FEATURE: /, "")}</p>
                <div className="v-item-bottom">{owned ? <span className="v-owned"><Check size={14}/>{equipped ? "Equipped" : "Owned"}</span> : <Price item={item}/>}
                  <button className="v-card-action" onClick={() => setPeek(item)} aria-label={"View " + item.name}>View <ArrowUpRight size={14}/></button></div></div>
            </article>;
          })}</div> : <div className="v-empty"><Heart size={30}/><h3>{section === "wishlist" && !wishCount ? "Keep your favorites close." : "No items match just yet."}</h3><p>{section === "wishlist" && !wishCount ? "Tap the heart on any item to save it here for later." : "Try another category, clear your search, or reset the filters."}</p><button className="v-button" onClick={() => { setFilters(initialFilters); if (section === "wishlist") setSection("browse"); }}>Explore items</button></div>}
        </div>
      </>}
      {section === "activities" && <div className="v-activity-panel">
        <div className="v-section-heading"><div><p className="v-eyebrow">A LITTLE DISCOVERY</p><h2>Something good is waiting.</h2><p>Visit the wheel or check on your incubating eggs.</p></div></div>
        <SegmentedTabs<"spin" | "incubator"> label="Store activities" value={activity} onChange={setActivity} panelId="activity-content" options={[{ id: "spin", label: "Lucky Spin", icon: <Disc size={16}/> }, { id: "incubator", label: "Incubator", icon: <Egg size={16}/> }]}/>
        <div id="activity-content" role="tabpanel" aria-label={activity === "spin" ? "Lucky Spin" : "Incubator"}>{activity === "spin" ? <LuckySpinView onMessage={setNote} stats={stats} onStats={onStats} profile={profile} onProfile={onProfile}/> : <IncubatorView onMessage={setNote} stats={stats} onStats={onStats} profile={profile} onProfile={onProfile}/>}</div>
      </div>}

      {section === "exchange" && <>
        <div className="v-section-heading"><div><p className="v-eyebrow">THE EXCHANGE</p><h2>Turn your play into possibilities.</h2><p>Use earned Sparks to unlock Diamonds. Preview the balance before confirming.</p></div><Gem size={35}/></div>
        <div className="v-exchange-grid">{STORE_ITEMS.filter(item => item.pack).map(item => <article className="v-exchange-card" key={item.id}>
          <span className="v-eyebrow">{item.isSale ? "SPECIAL RATE" : "SPARK EXCHANGE"}</span><ItemArt item={item}/><h3>{item.name}</h3><Price item={item}/>
          <p>{(item.cost / item.pack.diamonds).toLocaleString(undefined, { maximumFractionDigits: 1 })} Sparks per Diamond</p>
          <button className="v-button" onClick={() => setPeek(item)}>Review exchange <ArrowUpRight size={15}/></button>
        </article>)}</div><p className="v-footnote">In-game currency only. An exchange spends Sparks immediately when you confirm.</p>
      </>}
    </section>

    {peek && <Modal title={peek.pack ? "Review exchange" : peek.name} onClose={() => !checkoutBusy && setPeek(null)} className="v-item-dialog">
      <div className="v-preview-layout"><div className={"v-preview-stage " + (peek.themeSwatch ? "is-arena" : "")}>
        {["avatars", "frames", "banners", "styles", "titles"].includes(peek.tab) ? <LoadoutPreview item={peek} profile={profile} name={loadName()}/> : <ItemArt item={peek} large/>}
      </div><div className="v-preview-details"><span className={"v-rarity rarity-" + (peek.rarity ?? "common")}>{peek.rarity ?? "common"} · {peek.tab === "diamonds" ? "exchange" : peek.tab}</span>
        <p>{peek.desc}</p>{peek.tab === "audio" && <p className="v-footnote">Changes the sound effects in your next run.</p>}
        {!peek.pack && <button className="v-text-button" onClick={() => toggleWish(peek)}><Heart size={15} fill={profile.wishlist?.includes(peek.id) ? "currentColor" : "none"}/>{profile.wishlist?.includes(peek.id) ? "Saved to wishlist" : "Save for later"}</button>}
        <div className="v-checkout"><div><span>{peekOwned ? "In your collection" : "Cost"}</span>{peekOwned ? <strong><Check size={16}/> Owned</strong> : <Price item={peek}/>}</div>
          {!peekOwned && <div><span>{shortage ? "Still needed" : "Balance after"}</span><strong>{(shortage || remaining).toLocaleString()} {peek.currency === "diamonds" ? "Diamonds" : "Sparks"}</strong></div>}
          {peek.pack && <div><span>Diamonds after</span><strong>{(stats.diamonds + (peek.pack.diamonds ?? 0)).toLocaleString()}</strong></div>}
        </div>
        <button className="v-button v-button-primary" disabled={checkoutBusy || peekEquipped || (!peekOwned && (!canAffordItem(peek, stats) || peek.active===false || profile.inventoryRules?.[peek.id]==="locked"))} onClick={() => confirm(peek)}>
          {checkoutBusy ? "Saving…" : profile.inventoryRules?.[peek.id]==="locked" ? "Locked by developer" : peek.active===false&&!peekOwned ? "Not currently for sale" : peekEquipped ? <><Check size={16}/> Equipped</> : peekOwned ? "Equip item" : shortage ? "Keep playing to unlock" : peek.pack ? "Confirm exchange" : "Buy & equip"}
        </button>
        <p className="v-footnote">{peekOwned ? "Equip any owned item whenever you like." : peek.pack ? "Your new Diamonds will be available immediately." : "Purchase once. Keep it in your collection."}</p>
      </div></div>
    </Modal>}
  </div>;
}
