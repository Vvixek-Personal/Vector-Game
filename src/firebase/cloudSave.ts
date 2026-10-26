import { doc, setDoc } from "firebase/firestore";
import { auth, db, sanitizeFirestoreData } from "./config";
import { safeStorage, getSaveScope } from "../game/persistence";
let readyUid:string|null=null,pending:Record<string,unknown>={},timer:ReturnType<typeof setTimeout>|undefined;
let inFlight:Promise<void>|null=null;
export function beginCloudSync(){readyUid=null;pending={};clearTimeout(timer);}
export function completeCloudSync(uid:string){if(auth.currentUser?.uid===uid&&getSaveScope()===uid)readyUid=uid;}
export async function flushCloudSave(){
  clearTimeout(timer);if(inFlight)await inFlight;
  const uid=readyUid;if(!uid||auth.currentUser?.uid!==uid||getSaveScope()!==uid||!Object.keys(pending).length)return;
  const patch={...pending,userId:uid};pending={};
  inFlight=setDoc(doc(db,"users",uid),sanitizeFirestoreData(patch),{merge:true}).catch(error=>{if(readyUid===uid)pending={...patch,...pending};throw error;}).finally(()=>{inFlight=null;});
  return inFlight;
}
export function queueCloudSave(patch:Record<string,any>){
  if(!readyUid||auth.currentUser?.uid!==readyUid||getSaveScope()!==readyUid)return;
  // Account balances, ownership, roles and names are server managed.
  if(patch.settings){pending.settings=patch.settings;pending.settingsUpdatedAt=patch.settingsUpdatedAt||Date.now();}
  if(patch.profile){pending.preferences={wishlist:patch.profile.wishlist||[],favoriteModes:patch.profile.favoriteModes||[]};pending.preferencesUpdatedAt=patch.profileUpdatedAt||Date.now();}
  clearTimeout(timer);timer=setTimeout(()=>{void flushCloudSave().catch(()=>console.warn("Preferences are saved on this device; cloud sync will retry."));},200);
}
export const SAVE_KEYS={stats:"vector_stats_v5",profile:"vector_profile_v5",settings:"vector_settings_v5",missions:"vector_missions_v1",operativeName:"vector_player_name"} as const;
export function persistSave(field:keyof typeof SAVE_KEYS,value:unknown){
  const key=SAVE_KEYS[field],raw=field==="operativeName"?String(value):JSON.stringify(value);
  if(safeStorage.getItem(key)===raw)return;
  const timestamp=Date.now();safeStorage.setItem(key,raw);safeStorage.setItem(key+"_updatedAt",String(timestamp));queueCloudSave({[field]:value,[field+"UpdatedAt"]:timestamp});
}
