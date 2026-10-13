import {env} from 'cloudflare:workers';
import {hashPassword} from '../../../lib/auth';

export async function GET(){
  try{
    const row=await env.DB.prepare('SELECT COUNT(*) as n FROM users').first<{n:number}>();
    return Response.json({needed:!row||row.n===0});
  }catch{return Response.json({needed:true})}
}

export async function POST(req:Request){
  try{
    const row=await env.DB.prepare('SELECT COUNT(*) as n FROM users').first<{n:number}>();
    if(row&&row.n>0)return Response.json({error:'Un compte existe déjà ; demandez au ou à la responsable de vous créer un accès.'},{status:403});
    const body=await req.json() as {username?:string;password?:string;displayName?:string};
    const username=typeof body.username==='string'?body.username.trim().toLowerCase():'';
    const password=typeof body.password==='string'?body.password:'';
    const displayName=typeof body.displayName==='string'?body.displayName.trim():'';
    if(username.length<3||username.length>50||!/^[a-z0-9._-]+$/.test(username))return Response.json({error:'Identifiant invalide (3 caractères minimum, lettres/chiffres/._- uniquement).'},{status:400});
    if(password.length<8||password.length>200)return Response.json({error:'Mot de passe trop court (8 caractères minimum).'},{status:400});
    if(!displayName||displayName.length>100)return Response.json({error:'Nom à afficher requis.'},{status:400});
    const hash=await hashPassword(password);
    const id=crypto.randomUUID();
    await env.DB.prepare('INSERT INTO users (id,username,password_hash,display_name,roles,active,created_at) VALUES (?,?,?,?,?,1,?)').bind(id,username,hash,displayName,JSON.stringify(['Responsable']),new Date().toISOString()).run();
    return Response.json({ok:true});
  }catch(e){return Response.json({error:e instanceof Error&&/UNIQUE/.test(e.message)?'Cet identifiant est déjà pris.':'Création impossible.'},{status:400})}
}
