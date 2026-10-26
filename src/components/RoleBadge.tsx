import { ShieldCheck, Shield } from "lucide-react";
import { useAccount, type AccessRole } from "../firebase/accounts";
export default function RoleBadge({role}:{role?:AccessRole|string}){
  const current=useAccount();const value=role??current.role;
  if(value!=="developer"&&value!=="moderator")return null;
  const Icon=value==="developer"?ShieldCheck:Shield;
  return <span className={"role-badge "+value} title={value==="developer"?"Verified developer":"Moderator"}><Icon size={12}/>{value==="developer"?"Admin":"Moderator"}</span>;
}
