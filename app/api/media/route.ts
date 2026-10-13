import {env} from 'cloudflare:workers';
import {initialState,normalizeState} from '../../../lib/model';
import {currentUser,canEditWorkshop} from '../../../lib/auth';

const MAX_BYTES=25*1024*1024;
const EXT_BY_TYPE:Record<string,string>={
  'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif',
  'video/mp4':'mp4','video/quicktime':'mov','video/webm':'webm',
};

export async function GET(req:Request){
  const user=await currentUser(req);
  if(!user)return Response.json({error:'Connexion requise.'},{status:401});
  const key=new URL(req.url).searchParams.get('key');
  if(!key)return Response.json({error:'Fichier introuvable.'},{status:400});
  const obj=await env.MEDIA.get(key);
  if(!obj)return Response.json({error:'Fichier introuvable.'},{status:404});
  const headers=new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('Cache-Control','private, max-age=31536000, immutable');
  headers.set('ETag',obj.httpEtag);
  return new Response(obj.body,{headers});
}

export async function POST(req:Request){
  try{
    const user=await currentUser(req);
    if(!user)return Response.json({error:'Connexion requise.'},{status:401});
    const form=await req.formData();
    const file=form.get('file');
    const workshop=form.get('workshop');
    const which=form.get('which');
    if(!(file instanceof File))return Response.json({error:'Fichier manquant.'},{status:400});
    if(typeof workshop!=='string'||!workshop)return Response.json({error:'Atelier manquant.'},{status:400});
    if(which!=='before'&&which!=='after')return Response.json({error:'Choisissez avant ou après.'},{status:400});
    if(file.size<=0||file.size>MAX_BYTES)return Response.json({error:'Fichier trop volumineux (25 Mo maximum).'},{status:400});
    const row=await env.DB.prepare('SELECT payload FROM demo_state WHERE id=1').first<{payload:string}>();
    const state=normalizeState(row?JSON.parse(row.payload):initialState());
    const w=state.workshops.find((w:any)=>w.id===workshop);
    if(!w)return Response.json({error:'Atelier introuvable.'},{status:404});
    if(!canEditWorkshop(user,w))return Response.json({error:'Vous ne pouvez modifier que vos propres ateliers.'},{status:403});
    const ext=EXT_BY_TYPE[file.type]||(file.name.includes('.')?file.name.split('.').pop()!.toLowerCase().slice(0,5):'bin');
    const key=`workshops/${workshop}/${which}/${crypto.randomUUID()}.${ext}`;
    await env.MEDIA.put(key,await file.arrayBuffer(),{httpMetadata:{contentType:file.type||'application/octet-stream'}});
    return Response.json({key});
  }catch(e){return Response.json({error:'Envoi impossible.'},{status:400})}
}
