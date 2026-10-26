import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
async function masked(prompt){
  if(!process.stdin.isTTY)throw new Error("Open a terminal to enter the password privately.");
  process.stdout.write(prompt);process.stdin.setRawMode(true);process.stdin.resume();process.stdin.setEncoding("utf8");
  return new Promise((resolve,reject)=>{
    let value="";const finish=(error)=>{process.stdin.off("data",input);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write("\n");error?reject(error):resolve(value);};
    const input=chunk=>{for(const char of chunk){if(char==="\u0003"){finish(new Error("Cancelled."));return;}if(char==="\r"||char==="\n"){finish();return;}if(char==="\u007f"||char==="\b"){if(value){value=value.slice(0,-1);process.stdout.write("\b \b");}}else if(char>=" "&&value.length<256){value+=char;process.stdout.write("*");}}};
    process.stdin.on("data",input);
  });
}
let directory;
try{
  console.log("Configure Vector's production master password. Firebase owner login is required.");
  const password=await masked("New password (16–256 characters): ");
  if(password.length<16)throw new Error("Use at least 16 characters.");
  if(await masked("Confirm password: ")!==password)throw new Error("Passwords did not match.");
  const salt=randomBytes(32).toString("hex"),hash=await promisify(scrypt)(password,salt,64);
  directory=await mkdtemp(join(tmpdir(),"vector-secret-"));const file=join(directory,"master-hash.txt");
  await writeFile(file,"scrypt$"+salt+"$"+hash.toString("hex"),{mode:0o600});
  const cli=fileURLToPath(new URL("../functions/node_modules/firebase-tools/lib/bin/firebase.js",import.meta.url));
  const result=spawnSync(process.execPath,[cli,"functions:secrets:set","VECTOR_MASTER_PASSWORD_HASH","--data-file",file,"--project","steel-scanner-8xfhk"],{stdio:"inherit"});
  if(result.error)throw result.error;if(result.status!==0)throw new Error("Firebase did not save the secret. Sign in and retry.");
  console.log("The server secret is saved. Deploy the Functions update to activate it.");
}catch(error){console.error(error.message);process.exitCode=1;}
finally{if(directory)await rm(directory,{recursive:true,force:true});}
