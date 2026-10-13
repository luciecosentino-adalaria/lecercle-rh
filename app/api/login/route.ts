import {env} from 'cloudflare:workers';
import {verifyPassword,newSessionToken,sessionCookieHeader,sessionExpiry} from '../../../lib/auth';

export async function POST(req:Request){
  try{
    const body=await req.json() as {username?:string;password?:string};
    const username=typeof body.username==='string'?body.username.trim().toLowerCase():'';
    const password=typeof body.password==='string'?body.password:'';
    if(!username||!password)return Response.json({error:'Identifiant ou mot de passe incorrect.'},{status:401});
    const row=await env.DB.prepare('SELECT id,password_hash,display_name,roles,active FROM users WHERE username=?').bind(username).first<{id:string,password_hash:string,display_name:string,roles:string,active:number}>();
    if(!row||!row.active||!(await verifyPassword(password,row.password_hash)))return Response.json({error:'Identifiant ou mot de passe incorrect.'},{status:401});
    const token=newSessionToken();
    const now=new Date();
    await env.DB.prepare('INSERT INTO sessions (token,user_id,created_at,expires_at) VALUES (?,?,?,?)').bind(token,row.id,now.toISOString(),sessionExpiry(now).toISOString()).run();
    let roles:string[]=[];
    try{roles=JSON.parse(row.roles)}catch{roles=[]}
    const headers=new Headers({'Content-Type':'application/json'});
    headers.append('Set-Cookie',sessionCookieHeader(token));
    return new Response(JSON.stringify({user:{displayName:row.display_name,roles}}),{headers});
  }catch(e){return Response.json({error:'Connexion impossible.'},{status:400})}
}
