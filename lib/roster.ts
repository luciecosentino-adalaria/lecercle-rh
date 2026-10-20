import {env} from 'cloudflare:workers';
export async function activeDisplayNames():Promise<string[]>{
  const {results}=await env.DB.prepare('SELECT DISTINCT display_name FROM users WHERE active=1 ORDER BY display_name ASC').all<{display_name:string}>();
  return (results||[]).map(r=>r.display_name).filter(Boolean);
}
