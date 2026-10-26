import { useSyncExternalStore } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";
import type { User } from "firebase/auth";
import { app, auth, db } from "./config";
import { safeStorage, setSaveScope, getSaveScope } from "../game/persistence";
import { beginCloudSync, completeCloudSync, queueCloudSave, SAVE_KEYS } from "./cloudSave";
import type { Profile } from "../game/profile";
import type { Stats } from "../game/storage";

export type AccessRole = "guest" | "player" | "moderator" | "developer";
export interface AccountData {
  uid:string;email:string;operativeName:string;stats:Stats;profile:Profile;role:"player"|"moderator";
  developerUntil:number;ownerAccount?:boolean;nameChangesUsed:number;revision:number;
  daily:{day:string;streak:number};missions:Record<string,{period:string;items:any[]}>;
  spin:{lastFreeAt:number;history:{label:string;at:number}[]};incubator:any;accessRole?:AccessRole;
}
interface Session { status:"guest"|"loading"|"ready"|"offline";uid:string|null;role:AccessRole;account:AccountData|null;error:string; }
let session:Session={status:"guest",uid:null,role:"guest",account:null,error:""};
const listeners=new Set<()=>void>();
const functions=getFunctions(app,"us-central1");
if((import.meta.env?.DEV ? import.meta.env.VITE_VECTOR_EMULATORS : undefined)==="true")connectFunctionsEmulator(functions,"127.0.0.1",5001);
let generation=0;
let activeReconnect:(()=>Promise<void>)|null=null;
function parseSaved(key:string,fallback:any={}){try{return JSON.parse(safeStorage.getItem(key)||"null")??fallback;}catch{return fallback;}}
const notify=()=>{for(const fn of listeners)fn();if(typeof window!=="undefined")window.dispatchEvent(new Event("vector-account-updated"));};
export const getAccountSession=()=>session;
export function useAccount(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn);},()=>session,()=>session);}
export const isSignedAccount=()=>!!auth.currentUser&&!auth.currentUser.isAnonymous;
function computedRole(account:AccountData):AccessRole{
  const user=auth.currentUser;
  return user?.emailVerified&&user.email?.toLowerCase()==="personal.me.vivek@gmail.com"&&account.ownerAccount
    ||account.developerUntil>Date.now()?"developer":account.role==="moderator"?"moderator":"player";
}
function persistCanonical(account:AccountData){
  if(auth.currentUser?.uid!==account.uid||getSaveScope()!==account.uid)return;
  if(session.account?.uid===account.uid&&session.account.revision>account.revision)return;
  const previous=parseSaved(SAVE_KEYS.profile);
  const role=computedRole(account);
  const profile={...account.profile,wishlist:previous.wishlist??account.profile.wishlist??[],favoriteModes:previous.favoriteModes??account.profile.favoriteModes??[],
    accessRole:role,customPhotoURL:role==="developer"?account.profile.customPhotoURL:null,useGooglePfp:false};
  safeStorage.setItem(SAVE_KEYS.stats,JSON.stringify(account.stats));
  safeStorage.setItem(SAVE_KEYS.profile,JSON.stringify(profile));
  safeStorage.setItem(SAVE_KEYS.operativeName,account.operativeName);
  safeStorage.setItem("vector_incubator_state_v1",JSON.stringify(account.incubator));
  safeStorage.setItem("vector_last_free_spin_time",String(account.spin.lastFreeAt||0));
  safeStorage.setItem("vector_spin_history",JSON.stringify(account.spin.history.map(entry=>entry.label)));
  session={status:"ready",uid:account.uid,role,account:{...account,profile,accessRole:role},error:""};notify();
}
export async function callAccount<T=any>(name:string,data:Record<string,unknown>={},timeout=90000):Promise<T>{
  if(!isSignedAccount())throw new Error("Sign in with Google to use this feature.");
  const expectedUid=auth.currentUser!.uid;
  try{const result=(await httpsCallable(functions,name,{timeout})(data)).data as T;if(auth.currentUser?.uid!==expectedUid)throw new Error("The signed-in account changed. Please try again.");return result;}
  catch(error:any){
    if(["functions/unavailable","functions/not-found","functions/internal","functions/deadline-exceeded"].includes(error.code))throw new Error("Account services are unavailable. Reconnect when online; your saved progress is kept.");
    throw Object.assign(new Error(error.message?.replace(/^Firebase:\s*/,"")||"This action could not be saved."),{code:error.code});
  }
}
export async function accountAction(action:string,payload:Record<string,unknown>={},requestId:string=crypto.randomUUID()){
  if(session.status!=="ready"||session.uid!==auth.currentUser?.uid)throw new Error("Reconnect your account before changing its inventory.");
  const result=await callAccount<any>("gameAction",{action,payload,requestId});
  if(action==="purchase"&&payload.itemId){const raw=parseSaved(SAVE_KEYS.profile);raw.wishlist=(raw.wishlist||[]).filter((id:string)=>id!==payload.itemId);safeStorage.setItem(SAVE_KEYS.profile,JSON.stringify(raw));}
  if(result.account)persistCanonical(result.account);return result;
}
export function guestImport(){
  const parse=(key:string)=>{try{return JSON.parse(safeStorage.getItem(key)||"null");}catch{return null;}};
  return {stats:parse(SAVE_KEYS.stats),profile:parse(SAVE_KEYS.profile),operativeName:safeStorage.getItem(SAVE_KEYS.operativeName)||"Ace",incubator:parse("vector_incubator_state_v1"),spin:{lastFreeAt:Number(safeStorage.getItem("vector_last_free_spin_time"))||0,history:parse("vector_spin_history")}};
}
export function startAccountSession(user:User|null){
  const token=++generation;activeReconnect=null;beginCloudSync();let stop=()=>{},timer:ReturnType<typeof setInterval>|undefined;
  const previousScope=getSaveScope();setSaveScope("guest");const imported=guestImport();setSaveScope(previousScope);setSaveScope(user&&!user.isAnonymous?user.uid:"guest");
  session={status:user&&!user.isAnonymous?"loading":"guest",uid:user&&!user.isAnonymous?user.uid:null,role:user&&!user.isAnonymous?"player":"guest",account:null,error:""};notify();
  if(!user||user.isAnonymous)return()=>{};
  const connect=async()=>{
    if(token!==generation||auth.currentUser?.uid!==user.uid)return;
    session={...session,status:"loading",error:""};notify();
    try{
      const result=await callAccount<any>("bootstrapAccount",{guestImport:imported},90000);
      if(token!==generation||auth.currentUser?.uid!==user.uid)return;
      for(const [field,value]of [["settings",result.settings],["profile",result.preferences]] as const){
        if(!value)continue;
        const key=SAVE_KEYS[field],remoteTime=Number(result[field==="settings"?"settingsUpdatedAt":"preferencesUpdatedAt"])||0,localTime=Number(safeStorage.getItem(key+"_updatedAt"))||0;
        if(!safeStorage.getItem(key)||remoteTime>localTime){
          if(field==="settings")safeStorage.setItem(key,JSON.stringify(value));
          else {const current=parseSaved(key);safeStorage.setItem(key,JSON.stringify({...current,...value}));}
          safeStorage.setItem(key+"_updatedAt",String(remoteTime));
        }
      }
      persistCanonical(result.account);completeCloudSync(user.uid);
      const rawProfile=parseSaved(SAVE_KEYS.profile),rawSettings=safeStorage.getItem(SAVE_KEYS.settings);
      queueCloudSave({profile:rawProfile,...(rawSettings?{settings:parseSaved(SAVE_KEYS.settings)}:{})});
      stop();
      stop=onSnapshot(doc(db,"accounts",user.uid),snap=>{
        if(token!==generation||!snap.exists()||auth.currentUser?.uid!==user.uid)return;
        persistCanonical(snap.data() as AccountData);
      },()=>{if(token===generation){session={...session,error:"Live account updates are paused. Reconnect when online."};notify();}});
      await retryPendingRuns();
    }catch(error:any){if(token===generation){session={...session,status:"offline",error:error.message};notify();}}
  };
  activeReconnect=connect;void connect();
  const online=()=>void connect();
  if(typeof window!=="undefined")window.addEventListener("online",online);
  timer=setInterval(()=>{
    if(session.account&&session.role!==computedRole(session.account))persistCanonical(session.account);
  },15000);
  return()=>{if(token===generation){generation++;activeReconnect=null;}stop();clearInterval(timer);if(typeof window!=="undefined")window.removeEventListener("online",online);beginCloudSync();};
}
export async function reconnectAccount(){
  if(!isSignedAccount())return;if(activeReconnect)return activeReconnect();const response=await callAccount<any>("bootstrapAccount",{},90000);persistCanonical(response.account);return response;
}
export async function beginAccountRun(mode:string,multiplier:number){return callAccount<any>("beginRun",{mode,multiplier});}
export async function settleAccountRun(runId:string,summary:unknown){
  const uid=auth.currentUser?.uid;if(!uid)return;
  const pending=parseSaved("vector_pending_runs",[]);
  const entry={runId,summary};if(!pending.some((run:any)=>run.runId===runId))pending.push(entry);
  safeStorage.setItem("vector_pending_runs",JSON.stringify(pending.slice(-20)));
  try{
    const result=await accountAction("recordRun",{runId,summary},runId);
    if(auth.currentUser?.uid===uid)safeStorage.setItem("vector_pending_runs",JSON.stringify(parseSaved("vector_pending_runs",[]).filter((run:any)=>run.runId!==runId)));
    return result;
  }catch(error){if(permanentRunError(error)&&auth.currentUser?.uid===uid)safeStorage.setItem("vector_pending_runs",JSON.stringify(parseSaved("vector_pending_runs",[]).filter((run:any)=>run.runId!==runId)));throw error;}
}
function permanentRunError(error:any){return ["functions/failed-precondition","functions/invalid-argument","functions/permission-denied","functions/already-exists"].includes(error?.code);}
async function retryPendingRuns(){
  const pending=parseSaved("vector_pending_runs",[]);
  for(const entry of pending){try{await settleAccountRun(entry.runId,entry.summary);}catch(error){if(!permanentRunError(error))break;}}
}
export async function uploadDeveloperImage(file:File,purpose:"catalog"|"profile"){
  if(file.size>2*1024*1024)throw new Error("Choose a PNG, JPEG or WebP image under 2 MB.");
  const bytes=new Uint8Array(await file.arrayBuffer());let encoded="";
  for(let at=0;at<bytes.length;at+=32768)encoded+=String.fromCharCode(...bytes.subarray(at,at+32768));
  return callAccount<{url:string;message:string}>("uploadImage",{purpose,base64:btoa(encoded),requestId:crypto.randomUUID()},90000);
}
