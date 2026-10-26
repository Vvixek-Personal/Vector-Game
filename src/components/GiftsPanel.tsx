import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, orderBy, limit } from "firebase/firestore";
import { Gift, ArrowUpRight, Search, Send, Inbox, Clock3, Check } from "lucide-react";
import { db } from "../firebase/config";
import { useAccount, accountAction, callAccount } from "../firebase/accounts";
import { STORE_ITEMS } from "../game/catalog";
import { ownsStoreItem } from "../game/store";
import SegmentedTabs from "./shared/SegmentedTabs";
import Modal from "./shared/Modal";
import GoogleAuthButton from "./GoogleAuthButton";
export default function GiftsPanel(){
  const state=useAccount(),[tab,setTab]=useState<"inbox"|"sent"|"send">("inbox"),[inbox,setInbox]=useState<any[]>([]),[sent,setSent]=useState<any[]>([]),[note,setNote]=useState(""),[search,setSearch]=useState(""),[players,setPlayers]=useState<any[]>([]),[recipient,setRecipient]=useState<any>(null),[itemId,setItemId]=useState(""),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false),[pageSize,setPageSize]=useState(30);
  useEffect(()=>{
    if(!state.uid||state.status!=="ready")return;
    const error=()=>setNote("Gifts could not be loaded. Reconnect to try again.");
    const incoming=onSnapshot(query(collection(db,"gifts"),where("recipient","==",state.uid),orderBy("createdAt","desc"),limit(pageSize)),snap=>setInbox(snap.docs.map(doc=>({...doc.data(),id:doc.id}))),error);
    const outgoing=onSnapshot(query(collection(db,"gifts"),where("sender","==",state.uid),orderBy("createdAt","desc"),limit(pageSize)),snap=>setSent(snap.docs.map(doc=>({...doc.data(),id:doc.id}))),error);
    return()=>{incoming();outgoing();};
  },[state.uid,state.status,pageSize]);
  const run=async(action:string,payload:any)=>{if(busy)return;setBusy(true);try{const result=await accountAction(action,payload);setNote(result.message);setConfirm(false);}catch(error:any){setNote(error.message);}finally{setBusy(false);}};
  if(state.status==="guest")return <div className="v-empty"><Gift size={30}/><h3>Share something good.</h3><p>Sign in to send and receive gifts with other players.</p><GoogleAuthButton/></div>;
  const account=state.account;
  const giftable=account?STORE_ITEMS.filter(item=>!item.pack&&ownsStoreItem(item,account.profile,account.stats)):[];
  const selected=giftable.find(item=>item.id===itemId);
  return <section className="gifts-panel">
    <div className="v-section-heading"><div><p className="v-eyebrow">PLAYER TO PLAYER</p><h2>A little gift. A good day.</h2><p>Gifting transfers your item out of your vault. Verified developers keep their copy.</p></div><Gift size={28}/></div>
    <SegmentedTabs<"inbox"|"sent"|"send"> label="Gift sections" value={tab} onChange={setTab} panelId="gift-content" options={[{id:"inbox",label:"Received",icon:<Inbox size={15}/>,count:inbox.filter(g=>g.status==="pending").length},{id:"sent",label:"Sent",icon:<Send size={15}/>},{id:"send",label:"Send a gift",icon:<Gift size={15}/>} ]}/>
    <p className="form-note" role="status">{note}</p>
    <div id="gift-content" role="tabpanel" aria-label={tab==="inbox"?"Received gifts":tab==="sent"?"Sent gifts":"Send a gift"}>
      {tab==="send"?<div className="gift-compose form-grid">
        <label className="form-field"><span>Find a player</span><div className="field-with-action"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Player name or exact player ID"/><button className="v-button" disabled={busy||state.status!=="ready"} onClick={async()=>{setBusy(true);try{setPlayers((await callAccount<any>("playerDirectory",{query:search})).players.filter((p:any)=>p.uid!==state.uid));}catch(error:any){setNote(error.message);}finally{setBusy(false);}}}><Search size={15}/>Search</button></div></label>
        {players.length>0&&<div className="player-pick-list">{players.map(player=><button key={player.uid} aria-pressed={recipient?.uid===player.uid} onClick={()=>setRecipient(player)}><strong>{player.name}</strong><small>{player.uid}</small>{recipient?.uid===player.uid&&<Check size={16}/>}</button>)}</div>}
        <label className="form-field"><span>Item from your vault</span><select value={itemId} onChange={e=>setItemId(e.target.value)}><option value="">Choose an item</option>{giftable.map(item=><option key={item.id} value={item.id}>{item.name} · {item.tab}</option>)}</select></label>
        <p className="form-note">Custom player-specific titles and currency packs cannot be gifted. A pending gift can be returned or cancelled. Your player ID: <code>{state.uid}</code></p>
        <button className="v-button v-button-primary" disabled={!recipient||!selected||busy||state.status!=="ready"} onClick={()=>setConfirm(true)}>Review gift <ArrowUpRight size={15}/></button>
      </div>:<div className="gift-list">{(tab==="inbox"?inbox:sent).length?(tab==="inbox"?inbox:sent).map(gift=><article key={gift.id} className="gift-card"><Gift size={22}/><div><strong>{gift.itemName}</strong><p>{tab==="inbox"?"From "+gift.senderName:"To "+gift.recipientName}</p><small>{new Date(gift.createdAt).toLocaleDateString()} · {gift.status}</small></div>{gift.status==="pending"&&<div className="gift-actions">{tab==="inbox"&&<button className="v-button v-button-primary" disabled={busy} onClick={()=>run("claimGift",{giftId:gift.id})}>Accept</button>}<button className="v-button" disabled={busy} onClick={()=>run("returnGift",{giftId:gift.id})}>{tab==="inbox"?"Return":"Cancel gift"}</button></div>}</article>):<div className="v-empty"><Clock3 size={28}/><h3>No gifts here yet.</h3><p>A gift you send or receive will appear here.</p></div>}</div>}
    </div>
    {tab!=="send"&&(tab==="inbox"?inbox:sent).length>=pageSize&&<button className="v-button" disabled={busy} onClick={()=>setPageSize(size=>size+30)}>Load more gifts</button>}
    {confirm&&recipient&&selected&&<Modal title="Confirm gift" onClose={()=>!busy&&setConfirm(false)}><div className="form-grid"><p>Send <strong>{selected.name}</strong> to <strong>{recipient.name}</strong>?</p><p className="form-note">{state.role==="developer"?"Your developer account keeps its copy.":"This item leaves your vault and is held until accepted. It returns if the gift is cancelled or returned."}</p><button className="v-button v-button-primary" disabled={busy} onClick={()=>run("sendGift",{recipient:recipient.uid,itemId:selected.id})}>{busy?"Sending…":"Send gift"}</button></div></Modal>}
  </section>;
}
