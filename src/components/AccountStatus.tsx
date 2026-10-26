import { useState, useEffect } from "react";
import { CloudOff, RefreshCw, X } from "lucide-react";
import { useAccount, reconnectAccount } from "../firebase/accounts";
export default function AccountStatus({note=""}:{note?:string}){
  const state=useAccount(),[hidden,setHidden]=useState(false),[busy,setBusy]=useState(false);
  useEffect(()=>setHidden(false),[note,state.error,state.status]);
  if(hidden||state.status==="guest"&&!note||state.status==="ready"&&!note&&!state.error)return null;
  if(state.status==="loading")return null;
  const message=state.status==="offline"?state.error:note||state.error;
  if(!message)return null;
  return <div className="account-status" role="status"><CloudOff size={16}/><span>{message}</span>{state.status==="offline"&&<button disabled={busy} onClick={async()=>{setBusy(true);try{await reconnectAccount();}catch{}finally{setBusy(false);}}}><RefreshCw size={14}/>{busy?"Connecting…":"Reconnect"}</button>}<button aria-label="Dismiss account notice" onClick={()=>setHidden(true)}><X size={15}/></button></div>;
}
