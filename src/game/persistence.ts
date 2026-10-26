// Guest and each Firebase account have separate device save slots.
const memory=new Map<string,string>();
let scope="guest";
export function getSaveScope(){return scope;}
export function setSaveScope(value:string){scope=value==="guest"?"guest":String(value);}
export function scopedSaveKey(key:string){return scope==="guest"?key:"vector_account:"+scope+":"+key;}
export const safeStorage={
  getItem(key:string):string|null {const target=scopedSaveKey(key);try{return localStorage.getItem(target)??memory.get(target)??null;}catch{return memory.get(target)??null;}},
  setItem(key:string,value:string){const target=scopedSaveKey(key);memory.set(target,value);try{localStorage.setItem(target,value);}catch{}},
  removeItem(key:string){const target=scopedSaveKey(key);memory.delete(target);try{localStorage.removeItem(target);}catch{}},
};
