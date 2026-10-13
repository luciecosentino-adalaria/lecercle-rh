import {env} from 'cloudflare:workers';
import {currentUser,hasRole,hashPassword} from '../../../lib/auth';

const KNOWN_ROLES=['Équipier','Leader expérience','Logistique',"Responsable d'atelier",'Paie','Responsable'];

function cleanRoles(input:unknown):string[]{
  if(!Array.isArray(input))return [];
  const set=new Set(input.filter((r):r is string=>typeof r==='string'&&KNOWN_ROLES.includes(r)));
  return [...set];
}

export async function GET(req:Request){
  const user=await currentUser(req);
  if(!user||!hasRole(user,'Responsable'))return Response.json({error:"Réservé aux responsables."},{status:403});
  const {results}=await env.DB.prepare('SELECT id,username,display_name,roles,active,created_at FROM users ORDER BY created_at ASC').all<{id:string,username:string,display_name:string,roles:string,active:number,created_at:string}>();
  const accounts=(results||[]).map(r=>{let roles:string[]=[];try{roles=JSON.parse(r.roles)}catch{roles=[]}return {id:r.id,username:r.username,displayName:r.display_name,roles,active:!!r.active,createdAt:r.created_at}});
  return Response.json({accounts});
}

export async function POST(req:Request){
  const user=await currentUser(req);
  if(!user||!hasRole(user,'Responsable'))return Response.json({error:"Réservé aux responsables."},{status:403});
  try{
    const body=await req.json() as {username?:string;password?:string;displayName?:string;roles?:unknown};
    const username=typeof body.username==='string'?body.username.trim().toLowerCase():'';
    const password=typeof body.password==='string'?body.password:'';
    const displayName=typeof body.displayName==='string'?body.displayName.trim():'';
    const roles=cleanRoles(body.roles);
    if(username.length<3||username.length>50||!/^[a-z0-9._-]+$/.test(username))return Response.json({error:'Identifiant invalide (3 caractères minimum, lettres/chiffres/._- uniquement).'},{status:400});
    if(password.length<8||password.length>200)return Response.json({error:'Mot de passe trop court (8 caractères minimum).'},{status:400});
    if(!displayName||displayName.length>100)return Response.json({error:'Nom à afficher requis.'},{status:400});
    if(!roles.length)return Response.json({error:'Choisissez au moins un rôle.'},{status:400});
    const hash=await hashPassword(password);
    const id=crypto.randomUUID();
    await env.DB.prepare('INSERT INTO users (id,username,password_hash,display_name,roles,active,created_at) VALUES (?,?,?,?,?,1,?)').bind(id,username,hash,displayName,JSON.stringify(roles),new Date().toISOString()).run();
    return Response.json({ok:true,account:{id,username,displayName,roles,active:true}});
  }catch(e){return Response.json({error:e instanceof Error&&/UNIQUE/.test(e.message)?'Cet identifiant est déjà pris.':'Création impossible.'},{status:400})}
}

export async function PATCH(req:Request){
  const user=await currentUser(req);
  if(!user||!hasRole(user,'Responsable'))return Response.json({error:"Réservé aux responsables."},{status:403});
  try{
    const body=await req.json() as {id?:string;roles?:unknown;active?:boolean;password?:string;displayName?:string};
    const id=typeof body.id==='string'?body.id:'';
    if(!id)return Response.json({error:'Compte introuvable.'},{status:400});
    const sets:string[]=[];const binds:any[]=[];
    if(body.roles!==undefined){const roles=cleanRoles(body.roles);if(!roles.length)return Response.json({error:'Choisissez au moins un rôle.'},{status:400});sets.push('roles=?');binds.push(JSON.stringify(roles))}
    if(body.active!==undefined){sets.push('active=?');binds.push(body.active?1:0)}
    if(typeof body.displayName==='string'&&body.displayName.trim()){sets.push('display_name=?');binds.push(body.displayName.trim())}
    if(typeof body.password==='string'&&body.password){if(body.password.length<8||body.password.length>200)return Response.json({error:'Mot de passe trop court (8 caractères minimum).'},{status:400});sets.push('password_hash=?');binds.push(await hashPassword(body.password))}
    if(!sets.length)return Response.json({error:'Rien à mettre à jour.'},{status:400});
    binds.push(id);
    await env.DB.prepare(`UPDATE users SET ${sets.join(',')} WHERE id=?`).bind(...binds).run();
    if(body.active===false)await env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(id).run();
    return Response.json({ok:true});
  }catch(e){return Response.json({error:'Mise à jour impossible.'},{status:400})}
}
