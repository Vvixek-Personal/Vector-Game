import { useState } from "react";
import { ShieldCheck, LockKeyhole, Users, ShoppingBag, Activity, MessageSquare, UserRound } from "lucide-react";
import { useAccount, callAccount, reconnectAccount, uploadDeveloperImage } from "../../firebase/accounts";
import GoogleAuthButton from "../GoogleAuthButton";
import RoleBadge from "../RoleBadge";
import SegmentedTabs from "../shared/SegmentedTabs";
import PlayerManager from "./PlayerManager";
import CatalogManager from "./CatalogManager";
import { AuditPanel, FeedbackPanel } from "./ReviewPanels";
type Tab="players"|"store"|"activity"|"feedback"|"account";
export default function DeveloperPanel(){
  const state=useAccount(),[password,setPassword]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),[tab,setTab]=useState<Tab>("players");
  const unlock=async()=>{if(busy)return;setBusy(true);setMessage("");try{const result=await callAccount<any>("unlockDeveloper",{password});setPassword("");await reconnectAccount();setMessage(result.message);}catch(error:any){setMessage(error.message);}finally{setBusy(false);}};
  if(state.role!=="developer"&&state.role!=="moderator")return <section className="developer-gate">
    <div className="developer-lock"><LockKeyhole size={28}/></div><h2>Are you a Developer?</h2>
    <p>Sign in with <strong>personal.me.vivek@gmail.com</strong>, or unlock this tab with the configured master key.</p>
    {state.status==="guest"?<GoogleAuthButton/>:<>
      <p className="form-note">Signed in as {state.account?.email||"a player"}. Developer permissions are verified by the server.</p>
      {state.status==="offline"&&<button className="v-button" onClick={()=>void reconnectAccount().catch(error=>setMessage(error.message))}>Reconnect account</button>}
      <form className="developer-password form-grid" onSubmit={event=>{event.preventDefault();void unlock();}}>
        <label className="form-field"><span>Master key</span><input type="password" autoComplete="off" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} maxLength={256} required placeholder="Enter the configured master key"/></label>
        <button className="v-button v-button-primary" disabled={busy||state.status!=="ready"}>{busy?"Verifying…":"Unlock Developer tab"}</button>
      </form>
    </>}
    <p className="form-note">Master-password access lasts one hour. It does not turn the rest of the app into an editor.</p><p className="form-note" role="status">{message||state.error}</p>
  </section>;
  if(state.role==="moderator")return <section className="developer-console"><div className="v-section-heading"><div><h2>Moderator desk <RoleBadge/></h2><p>Review players, flag issues, and send feedback. Current and future store items are pre-unlocked for you unless individually restricted or gifted away.</p></div></div><FeedbackPanel moderator/></section>;
  return <section className="developer-console">
    <div className="v-section-heading"><div><p className="v-eyebrow"><ShieldCheck size={13}/> VERIFIED ACCESS</p><h2>Developer workspace <RoleBadge/></h2><p>Manage players and the store here. Changes are saved to Firebase and recorded in the activity log.</p></div></div>
    <SegmentedTabs<Tab> label="Developer tools" value={tab} onChange={setTab} panelId="developer-content" className="v-primary-tabs" options={[
      {id:"players",label:"Players",icon:<Users size={15}/>},{id:"store",label:"Store editor",icon:<ShoppingBag size={15}/>},{id:"activity",label:"Data & activity",icon:<Activity size={15}/>},{id:"feedback",label:"Feedback",icon:<MessageSquare size={15}/>},{id:"account",label:"My account",icon:<UserRound size={15}/>},
    ]}/>
    <div id="developer-content" role="tabpanel" aria-label={"Developer "+tab}>
      {tab==="players"&&<PlayerManager/>}{tab==="store"&&<CatalogManager/>}{tab==="activity"&&<AuditPanel/>}{tab==="feedback"&&<FeedbackPanel/>}
      {tab==="account"&&<div className="admin-panel form-grid"><h3>Your developer identity</h3><p>Admin badge is active. Name changes are unlimited while developer access is valid.</p><label className="form-field"><span>Custom profile picture · PNG, JPEG or WebP, up to 2 MB</span><input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={async event=>{const file=event.target.files?.[0];if(!file)return;setBusy(true);try{const result=await uploadDeveloperImage(file,"profile");setMessage(result.message);await reconnectAccount();}catch(error:any){setMessage(error.message);}finally{setBusy(false);event.target.value="";}}}/></label><p className="form-note">Only verified developers can upload a custom profile picture. Your new picture is used until you equip another avatar.</p>{state.account?.developerUntil>Date.now()&&<p className="form-note">Password access expires {new Date(state.account.developerUntil).toLocaleTimeString()}.</p>}<p role="status" className="form-note">{message}</p></div>}
    </div>
  </section>;
}
