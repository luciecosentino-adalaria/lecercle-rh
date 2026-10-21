import {env} from 'cloudflare:workers';
import {initialState,normalizeState} from '../../../../lib/model';

export async function GET(req:Request){
  try{
    const token=new URL(req.url).searchParams.get('token');
    if(!token)return Response.json({error:'Lien invalide.'},{status:400});
    const row=await env.DB.prepare('SELECT payload FROM demo_state WHERE id=1').first<{payload:string}>();
    const state=normalizeState(row?JSON.parse(row.payload):initialState());
    const w=state.workshops.find(w=>w.shareToken===token);
    if(!w)return Response.json({error:'Atelier introuvable ou lien expiré.'},{status:404});
    const checklist=state.workshopChecklists.filter(c=>c.workshop===w.id).map(c=>({item:c.item,done:c.done,comment:c.comment}));
    return Response.json({
      workshop:{name:w.name,type:w.type,place:w.place,date:w.date,start:w.start,end:w.end,responsible:w.responsible,photosBefore:w.photosBefore,photosAfter:w.photosAfter},
      checklist
    },{headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json({error:'Atelier indisponible.'},{status:503})}
}
