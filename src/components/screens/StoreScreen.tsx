import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { STORE_ITEMS, STORE_TABS, itemsFor, priceLabel, type StoreItem, type StoreTab } from "../../game/catalog";
import { convertSparksToDiamonds, spendDiamonds, spendSparks, type Stats } from "../../game/storage";
import { uiConfirm, uiTap, uiUnlock } from "../../game/haptics";
import type { Profile } from "../../game/profile";
import { Sparkles, Gem, User, Image, CircleDot, Palette, Layers, Award, Zap, X, Flame, Check, Disc, Egg, Music } from "lucide-react";
import CartoonAvatar from "../CartoonAvatar";
import AnimeAvatar from "../AnimeAvatar";
import Icon from "../Icon";
import { LuckySpinView } from "../store/LuckySpinView";
import { DURATION, EASE, backdropVariants, panelVariants } from "../../utils/motion";
import { IncubatorView } from "../store/IncubatorView";

interface Props {
  stats: Stats;
  onStats: (s: Stats) => void;
  profile: Profile;
  onProfile: (p: Profile) => void;
}

function TabIcon({ name }: { name: string }) {
  switch (name) {
    case "disc": return <Disc size={16} />;
    case "egg": return <Egg size={16} />;
    case "user": return <User size={16} />;
    case "image": return <Image size={16} />;
    case "circle-dot": return <CircleDot size={16} />;
    case "palette": return <Palette size={16} />;
    case "layers": return <Layers size={16} />;
    case "award": return <Award size={16} />;
    case "music": return <Music size={16} />;
    case "zap": return <Zap size={16} />;
    case "gem": return <Gem size={16} />;
    default: return <Sparkles size={16} />;
  }
}

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
        <span className="theme-arrow" style={{ color: item.themeSwatch[0], fontSize: isModal ? 38 : 28 }}>➤</span>
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
    <div
      className="store-swatch store-swatch-plain w-full"
      style={{ height: isModal ? 100 : 72 }}
    >
      {item.name[0]}
    </div>
  );
}

export default function StoreScreen({ stats, onStats, profile, onProfile }: Props) {
  const [tab, setTab] = useState<StoreTab>("avatars");
  const [note, setNote] = useState("");
  const [peek, setPeek] = useState<StoreItem | null>(null);
  const items = useMemo(() => itemsFor(tab), [tab]);
  const sparks = stats.sparks ?? 0;
  const diamonds = stats.diamonds ?? 0;

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

  return (
    <div className="store-page">
      <header className="home-header">
        <div className="wordmark"><Icon name="arrow" size={28} /><h1>Vector<span>.</span></h1></div>
        <div className="currency-row">
          <div className="spark-chip"><Sparkles size={14} className="inline-icon" /> {sparks.toLocaleString()}</div>
          <div className="diamond-chip"><Gem size={14} className="inline-icon" /> {diamonds.toLocaleString()}</div>
        </div>
      </header>
      <div className="store-heading">
        <h2>Store</h2>
      </div>

      <div className="store-layout">
        {/* Horizontal Tab Navigation Bar with Icons & Counts */}
        <nav className="store-horizontal-nav glass" aria-label="Store categories">
          {STORE_TABS.map((t) => {
            const isActive = tab === t.id;
            const count = STORE_ITEMS.filter((i) => i.tab === t.id).length;
            const badgeLabel = t.id === "spin" ? "FREE" : t.id === "incubator" ? "LAB" : count;
            return (
              <motion.button
                key={t.id}
                whileTap={{ scale: 0.97 }}
                className={`store-tab-pill ${isActive ? "active" : ""}`}
                onClick={() => { uiTap(); setTab(t.id); setNote(""); }}
              >
                {isActive && (
                  <motion.div
                    layoutId="storeTabActiveIndicator"
                    className="store-tab-active-bg"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="store-tab-icon"><TabIcon name={t.iconName} /></span>
                <span className="store-tab-label">{t.label}</span>
                <span className="store-tab-badge">{badgeLabel}</span>
              </motion.button>
            );
          })}
        </nav>

        {tab === "spin" ? (
          <motion.div
            key="tab-spin"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.base, ease: EASE.out }}
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
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.base, ease: EASE.out }}
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="store-grid"
          >
            {items.map((item, idx) => {
              const have = owned(item);
              return (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: DURATION.base, ease: EASE.out, delay: Math.min(0.16, idx * 0.02) }}
                  whileTap={{ scale: 0.99 }}
                  className={`store-card glass ${have ? "owned" : ""} ${item.rarity ?? ""}`}
                  onClick={() => { uiTap(); setPeek(item); }}
                >
                  {/* Badges row for New / Sale and Rarity */}
                  <div className="store-card-badge-row">
                    {item.isNew ? (
                      <span className="store-badge badge-new">
                        <Sparkles size={10} /> New
                      </span>
                    ) : item.isSale ? (
                      <span className="store-badge badge-sale">
                        <Flame size={10} /> -{item.salePercent}%
                      </span>
                    ) : <span />}
                    <span className={`store-badge badge-rarity ${item.rarity ?? "common"}`}>
                      {item.rarity ?? "common"}
                    </span>
                  </div>

                  <PreviewFace item={item} />
                  <h3>{item.name}</h3>
                  <p>{item.desc}</p>
                  <div className="store-price-container">
                    {have ? (
                      <span className="store-owned-badge">
                        <Check size={13} /> Owned
                      </span>
                    ) : (
                      priceLabel(item, "md")
                    )}
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        )}
      </div>
      {note && <p className="settings-status" role="status">{note}</p>}

      {/* Screen Modal Popup mounted via Portal for true non-scrolling centered overlay */}
      {typeof document !== "undefined" && createPortal(
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
                className="store-modal-card surface-card"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close X button */}
                <button className="store-modal-close" onClick={() => setPeek(null)} aria-label="Close preview">
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

                {/* Preview Stage */}
                <div className="store-modal-preview-stage">
                  <PreviewFace item={peek} isModal={true} />
                </div>

                <div>
                  <h3 className="t-title">{peek.name}</h3>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className={`store-badge badge-rarity ${peek.rarity ?? "common"}`}>
                      {peek.rarity ?? "common"}
                    </span>
                    <span className="t-caption">
                      {peek.currency === "diamonds" ? "Diamonds collection" : "Sparks collection"}
                    </span>
                  </div>
                </div>

                <p className="t-body">{peek.desc}</p>

                {/* Big Price Presentation */}
                <div className="store-modal-price-box">
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
                    onClick={() => { uiConfirm(); buy(peek); }}
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
