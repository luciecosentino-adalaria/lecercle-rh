import {env} from 'cloudflare:workers';
import {readSessionToken,clearedSessionCookieHeader} from '../../../lib/auth';

export async function POST(req:Request){
  const token=readSessionToken(req);
  if(token){try{await env.DB.prepare('DELETE FROM sessions WHERE token=?').bind(token).run()}catch{}}
  const headers=new Headers({'Content-Type':'application/json'});
  headers.append('Set-Cookie',clearedSessionCookieHeader());
  return new Response(JSON.stringify({ok:true}),{headers});
}
