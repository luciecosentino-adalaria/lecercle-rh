const PBKDF2_ITERATIONS=100000;
const SESSION_DAYS=30;

function toHex(buf:ArrayBuffer|Uint8Array):string{const bytes=buf instanceof Uint8Array?buf:new Uint8Array(buf);return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')}
function fromHex(hex:string):Uint8Array{const out=new Uint8Array(hex.length/2);for(let i=0;i<out.length;i++)out[i]=parseInt(hex.substr(i*2,2),16);return out}
function safeEqual(a:string,b:string):boolean{if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}

export async function hashPassword(password:string):Promise<string>{
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:salt as BufferSource,iterations:PBKDF2_ITERATIONS,hash:'SHA-256'},key,256);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${toHex(bits)}`;
}

export async function verifyPassword(password:string,stored:string):Promise<boolean>{
  const parts=stored.split('$');
  if(parts.length!==4||parts[0]!=='pbkdf2')return false;
  const iterations=Number(parts[1]);
  if(!Number.isInteger(iterations)||iterations<=0)return false;
  const salt=fromHex(parts[2]);
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:salt as BufferSource,iterations,hash:'SHA-256'},key,256);
  return safeEqual(toHex(bits),parts[3]);
}

export function newSessionToken():string{return crypto.randomUUID()+crypto.randomUUID().replace(/-/g,'')}

export function sessionCookieHeader(token:string):string{
  return `session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS*86400}`;
}
export function clearedSessionCookieHeader():string{
  return 'session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
}
export function sessionExpiry(from:Date=new Date()):Date{
  return new Date(from.getTime()+SESSION_DAYS*86400000);
}

export function readSessionToken(req:Request):string|null{
  const cookie=req.headers.get('Cookie')||'';
  const m=cookie.match(/(?:^|; )session=([^;]+)/);
  return m?m[1]:null;
}

export type AuthUser={id:string;username:string;displayName:string;roles:string[]};

export async function currentUser(req:Request):Promise<AuthUser|null>{
  const {env}=await import('cloudflare:workers');
  const token=readSessionToken(req);
  if(!token)return null;
  const row=await env.DB.prepare('SELECT u.id,u.username,u.display_name,u.roles FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>? AND u.active=1').bind(token,new Date().toISOString()).first<{id:string,username:string,display_name:string,roles:string}>();
  if(!row)return null;
  let roles:string[]=[];
  try{roles=JSON.parse(row.roles)}catch{roles=[]}
  return {id:row.id,username:row.username,displayName:row.display_name,roles};
}

export function hasRole(user:AuthUser|null,...roles:string[]):boolean{
  return !!user&&roles.some(r=>user.roles.includes(r));
}
export function canEditWorkshop(user:AuthUser|null,workshop:{responsible:string}):boolean{
  return hasRole(user,'Responsable')||(hasRole(user,"Responsable d'atelier")&&!!workshop.responsible&&workshop.responsible===user?.displayName);
}
