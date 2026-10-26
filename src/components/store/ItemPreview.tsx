import type { StoreItem } from "../../game/catalog";
import { bannerFor, TITLES, type Profile } from "../../game/profile";
import Avatar from "../Avatar";
import AnimeAvatar from "../AnimeAvatar";
import HeroAvatar from "../HeroAvatar";
import CartoonAvatar from "../CartoonAvatar";
import { Gem, AudioLines } from "lucide-react";

export function ItemArt({ item, large = false }: { item: StoreItem; large?: boolean }) {
  const size = large ? 132 : 88;
  if (item.photo) return <img className="custom-item-art" src={item.photo} alt="" style={{width:size,height:size,objectFit:"cover",borderRadius:"20%"}} loading="lazy"/>;
  if (item.hero) return <HeroAvatar id={item.hero} size={size}/>;
  if (item.anime) return <AnimeAvatar id={item.anime} size={size}/>;
  if (item.cartoon) return <CartoonAvatar id={item.cartoon} size={size}/>;
  if (item.themeSwatch) return <div className="v-arena-art" style={{ background: item.themeSwatch[1], color: item.themeSwatch[0], boxShadow: "inset 0 0 45px " + item.themeSwatch[2] + "44" }}><span>➤</span><i/><i/><i/></div>;
  if (item.frameCss) return <span className="v-frame-art" style={{ boxShadow: item.frameCss }}>V</span>;
  if (item.tab === "styles") return <div className="v-banner-art" style={{ background: "linear-gradient(120deg,#1e3054,#8d63ae)" }}><span className="profile-hero-pattern" data-pattern={item.pattern}/><b>VECTOR.</b></div>;
  if (item.tab === "banners") return <div className="v-banner-art" style={{ background: item.preview }}><b>VECTOR.</b></div>;
  if (item.tab === "titles") return <span className="v-title-art">{item.name}</span>;
  if (item.pack) return <div className="v-diamond-art"><Gem size={large ? 48 : 36}/><b>{item.pack.diamonds?.toLocaleString()}</b></div>;
  if (item.tab === "audio") return <div className="v-audio-art"><AudioLines size={42}/><span>{[16,30,42,26,36,18,28].map((h,i)=><i key={i} style={{ height: h }}/>)}</span></div>;
  return <span className="v-glyph-art">{item.preview ?? item.name[0]}</span>;
}
export function LoadoutPreview({ item, profile, name }: { item?: StoreItem; profile: Profile; name: string }) {
  const preview = { ...profile, ...item?.apply };
  const title = preview.customTitles?.find(t=>t.id===preview.titleId)?.name ?? TITLES.find(t => t.id === preview.titleId)?.name ?? "Rookie";
  return <div className="v-loadout-preview" style={{ background: bannerFor(preview).css }}>
    <span className="profile-hero-pattern" data-pattern={preview.bannerStyle}/>
    <Avatar profile={preview} name={name} size={70}/>
    <strong>{name}</strong><span>{title}</span>
    <small>{item ? "Preview only · your loadout changes when you equip" : "Your current look"}</small>
  </div>;
}
