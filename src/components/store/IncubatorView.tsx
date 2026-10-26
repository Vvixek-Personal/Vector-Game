import { useEffect, useRef, useState } from "react";
import { Egg, Clock3, Zap, Sparkles, Gem, Check } from "lucide-react";
import { EGG_DEFS, loadIncubatorState, startIncubation, speedUpPod, hatchPod, addEggToInventory, type EggType } from "../../game/incubator";
import { loadStats, spendSparks, spendDiamonds, loadSettings, type Stats } from "../../game/storage";
import { loadProfile, type Profile } from "../../game/profile";
import { accountAction, isSignedAccount, useAccount } from "../../firebase/accounts";
import Modal from "../shared/Modal";
interface Props {stats:Stats;onStats:(stats:Stats)=>void;profile:Profile;onProfile:(profile:Profile)=>void;onMessage:(message:string)=>void}
export function IncubatorView({stats,onStats,onProfile,onMessage}:Props){
  const account=useAccount(),[state,setState]=useState(loadIncubatorState),[selected,setSelected]=useState(""),[busy,setBusy]=useState(false),[note,setNote]=useState(""),[reveal,setReveal]=useState(""),[,tick]=useState(0);const pending=useRef(false);
  useEffect(()=>{setState(loadIncubatorState());},[account.account?.revision]);
  useEffect(()=>{const timer=setInterval(()=>tick(n=>n+1),1000);return()=>clearInterval(timer);},[]);
  const act=async(action:"buyEgg"|"startEgg"|"boostEgg"|"hatchEgg",payload:any)=>{
    if(pending.current)return;pending.current=true;setBusy(true);
    try{
      let message="";
      if(isSignedAccount()){const result=await accountAction(action,payload);message=result.message;}
      else if(action==="buyEgg"){
        const def=EGG_DEFS[payload.eggType as EggType],currency=payload.currency,cost=currency==="diamonds"?def.costDiamonds:def.costSparks;
        if(cost<=0)throw new Error("Choose another payment option.");
        if(!(currency==="diamonds"?spendDiamonds(cost):spendSparks(cost)))throw new Error("Not enough "+currency+".");
        addEggToInventory(payload.eggType);message=def.name+" purchased.";
      }else if(action==="startEgg"){
        if(!startIncubation(payload.eggId,payload.pod))throw new Error("Choose an egg and an empty pod.");setSelected("");message="Incubation started.";
      }else if(action==="boostEgg"){
        const pod=loadIncubatorState().pods[payload.pod];if(!pod||pod.readyAt<=Date.now())throw new Error("This pod does not need a boost.");
        if(!spendSparks(50))throw new Error("A boost costs 50 Sparks.");speedUpPod(payload.pod);message="Your egg is ready.";
      }else{
        const result=hatchPod(payload.pod,loadStats(),loadProfile());if(!result)throw new Error("The egg is not ready.");message=result.reward.description;
      }
      if(action==="startEgg")setSelected("");onStats(loadStats());onProfile(loadProfile());setState(loadIncubatorState());setNote(message);onMessage(message);if(action==="hatchEgg")setReveal(message);
    }catch(error:any){setNote(error.message);onMessage(error.message);}finally{pending.current=false;setBusy(false);}
  };
  return <section className="incubator-v3">
    <div className="v-section-heading"><div><p className="v-eyebrow">YOUR HATCHERY</p><h2>A little patience. A new find.</h2><p>Choose an egg, place it in a pod, and collect its reward when ready.</p></div><Egg size={30}/></div>
    <p className="form-note" role="status">{note}</p>
    <div className="egg-pods">{state.pods.map((pod,index)=>{const remaining=pod?Math.max(0,pod.readyAt-Date.now()):0,ready=!!pod&&remaining===0,def=pod?EGG_DEFS[pod.eggType]:null;return <article key={index}><div><span className="v-eyebrow">POD {index+1}</span><span>{ready?<Check size={17}/>:<Clock3 size={17}/>}</span></div><span className="egg-symbol">{def?.eggIcon||"◌"}</span><h3>{def?.name||"Ready for an egg"}</h3><p>{pod?ready?"Ready to hatch":Math.ceil(remaining/1000)+" seconds remaining":"Select an egg from your inventory below."}</p>{pod?<><progress max={pod.durationMs} value={Math.max(0,pod.durationMs-remaining)}/><button className="v-button v-button-primary" disabled={busy} onClick={()=>void act(ready?"hatchEgg":"boostEgg",{pod:index})}>{ready?"Hatch egg":<><Zap size={14}/>Finish now · 50 Sparks</>}</button></>:<button className="v-button" disabled={busy||!selected} onClick={()=>void act("startEgg",{pod:index,eggId:selected})}>Place selected egg</button>}</article>;})}</div>
    <div className="v-section-heading"><div><h2>Your eggs</h2><p>Tap one to select it, then choose an empty pod.</p></div></div><div className="egg-inventory">{state.inventory.length?state.inventory.map(egg=><button key={egg.id} aria-pressed={selected===egg.id} onClick={()=>setSelected(egg.id)}><span>{EGG_DEFS[egg.eggType].eggIcon}</span><strong>{EGG_DEFS[egg.eggType].name}</strong><small>{EGG_DEFS[egg.eggType].durationSeconds}s incubation</small>{selected===egg.id&&<Check size={15}/>}</button>):<p className="form-note">Your egg inventory is empty. Win one on the wheel or choose one below.</p>}</div>
    <div className="v-section-heading"><div><h2>Egg market</h2><p>Choose exactly which currency to spend. A purchase adds one egg to your inventory.</p></div></div><div className="egg-market">{(["neon","quantum","solar"] as EggType[]).map(type=>{const def=EGG_DEFS[type];return <article key={type}><span className="egg-symbol">{def.eggIcon}</span><span className="v-rarity">{def.tier}</span><h3>{def.name}</h3><p>{def.durationSeconds}s incubation</p><ul>{def.possibleLoot.map(line=><li key={line}>{line}</li>)}</ul><button className="v-button" disabled={busy||stats.sparks<def.costSparks} onClick={()=>void act("buyEgg",{eggType:type,currency:"sparks"})}><Sparkles size={13}/>Buy · {def.costSparks.toLocaleString()} Sparks</button>{def.costDiamonds>0&&<button className="v-button" disabled={busy||stats.diamonds<def.costDiamonds} onClick={()=>void act("buyEgg",{eggType:type,currency:"diamonds"})}><Gem size={13}/>Buy · {def.costDiamonds} Diamonds</button>}</article>;})}</div>
    {reveal&&<Modal title="Egg hatched" onClose={()=>setReveal("")}><div className="form-grid"><Egg size={38} className="accent"/><p>{reveal}</p><p className="form-note">The reward is already saved to your account or this device.</p><button className="v-button v-button-primary" onClick={()=>setReveal("")}>Done</button></div></Modal>}
  </section>;
}
