import { STORE_ITEMS } from "./catalog";
import { transactStoreItem, type StoreResult } from "./store";
import { loadProfile } from "./profile";
import { loadStats } from "./storage";
import { accountAction, isSignedAccount } from "../firebase/accounts";
export async function requestStoreAction(id:string,intent:"buy"|"equip",requestId?:string,quote?:{cost:number;currency:string}):Promise<StoreResult>{
  const item=STORE_ITEMS.find(item=>item.id===id);if(!item)return {ok:false,reason:"This item is unavailable."};
  if(intent==="buy"&&quote&&(quote.cost!==item.cost||quote.currency!==item.currency))return {ok:false,reason:"The price changed. Review the updated price before buying."};
  if(!isSignedAccount())return transactStoreItem(id,intent);
  try{
    const result=await accountAction(intent==="equip"?"equip":"purchase",{itemId:id,expectedCost:quote?.cost??item.cost,expectedCurrency:quote?.currency??item.currency},requestId);
    return {ok:true,stats:loadStats(),profile:loadProfile(),kind:intent==="equip"?"equipped":item.pack?"exchanged":"bought"};
  }catch(error:any){return {ok:false,reason:error.message};}
}
