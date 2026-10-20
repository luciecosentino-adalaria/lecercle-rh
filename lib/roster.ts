import {env} from 'cloudflare:workers';
export async function activeDisplayNames():Promise<string[]>{
  const {results}=await env.DB.prepare('SELECT DISTINCT display_name FROM users WHERE active=1 ORDER BY display_name ASC').all<{display_name:string}>();
  return (results||[]).map(r=>r.display_name).filter(Boolean);
}
export async function activeDisplayNamesByRoles(roles:string[]):Promise<string[]>{
  const {results}=await env.DB.prepare('SELECT display_name,roles FROM users WHERE active=1 ORDER BY display_name ASC').all<{display_name:string,roles:string}>();
  return (results||[]).filter(r=>{try{const rs=JSON.parse(r.roles||'[]');return roles.some(role=>rs.includes(role))}catch{return false}}).map(r=>r.display_name).filter(Boolean);
}
