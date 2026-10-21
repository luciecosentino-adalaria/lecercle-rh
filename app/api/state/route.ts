import {env} from 'cloudflare:workers';
import {initialState,transition,normalizeState} from '../../../lib/model';
import {currentUser,hasRole,canEditWorkshop,type AuthUser} from '../../../lib/auth';
import {activeDisplayNames} from '../../../lib/roster';

function ownerRoles(a:any,state:any):string[]|'any'{
  const t=a?.type;
  if(t==='approval'||t==='geoSettings')return ['Responsable'];
  if(t==='expenseReimbursed'||t==='reimbursePerson'||t==='hourlyRate'||t==='validate')return ['Responsable','Paie'];
  if(t==='confirm')return ['Responsable','Logistique'];
  if(t==='event')return ['Responsable','Leader expérience'];
  if(t==='mission')return ['Responsable','Logistique'];
  if(t==='production')return ['Responsable'];
  if(t==='workshop')return ['Responsable',"Responsable d'atelier"];
  if(t==='cleaningCatalogUpdate')return ['Responsable',"Responsable d'atelier"];
  if(t==='workshopUpdate'||t==='workshopDelete')return ['Responsable',"Responsable d'atelier"];
  return 'any';
}

function workshopIdFor(a:any):string|null{
  if(a?.type==='workshopPhotos'||a?.type==='workshopPhotoRemove')return typeof a.workshop==='string'?a.workshop:null;
  if(a?.type==='workshopChecklistItem')return typeof a.id==='string'?a.id.split('#')[0]:null;
  return null;
}

function authorize(user:AuthUser,a:any,state:any):string|null{
  const wid=workshopIdFor(a);
  if(wid){
    const w=state.workshops.find((w:any)=>w.id===wid);
    if(w&&canEditWorkshop(user,w))return null;
    if(!w&&hasRole(user,'Responsable'))return null;
    return 'Vous ne pouvez modifier que vos propres ateliers.';
  }
  const need=ownerRoles(a,state);
  if(need==='any')return null;
  if(hasRole(user,...need))return null;
  return "Vous n'avez pas les droits pour cette action.";
}

export async function GET(req:Request){
  try{
    const user=await currentUser(req);
    if(!user)return Response.json({error:'Connexion requise.'},{status:401});
    await env.DB.prepare('INSERT OR IGNORE INTO demo_state (id,revision,payload) VALUES (1,0,?)').bind(JSON.stringify(initialState())).run();
    const row=await env.DB.prepare('SELECT revision,payload FROM demo_state WHERE id=1').first<{revision:number,payload:string}>();
    const original=row!.payload;
    const state=normalizeState(JSON.parse(original));
    const migrated=JSON.stringify(state);
    let revision=row!.revision;
    if(migrated!==original){
      const result=await env.DB.prepare('UPDATE demo_state SET payload=?,revision=revision+1 WHERE id=1 AND revision=?').bind(migrated,revision).run();
      if(result.meta.changes)revision=revision+1;
    }
    return Response.json({revision,state},{headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json({error:'La sauvegarde est temporairement indisponible.'},{status:503})}
}

export async function POST(req:Request){
  try{
    const origin=req.headers.get('origin');
    if(origin&&origin!==new URL(req.url).origin)return Response.json({error:'Origine invalide.'},{status:403});
    const user=await currentUser(req);
    if(!user)return Response.json({error:'Connexion requise.'},{status:401});
    const {revision,action}=await req.json() as {revision:number;action:any};
    const row=await env.DB.prepare('SELECT revision,payload FROM demo_state WHERE id=1').first<{revision:number,payload:string}>();
    if(!row||revision!==row.revision)return Response.json({error:'Le planning a changé. Rechargez les données puis réessayez.'},{status:409});
    const current=normalizeState(JSON.parse(row.payload));
    const denied=authorize(user,action,current);
    if(denied)return Response.json({error:denied},{status:403});
    let removedKeys:string[]=[];
    if(action?.type==='workshopPhotoRemove'){
      const w=current.workshops.find((w:any)=>w.id===action.workshop);
      const list=w?(action.which==='before'?w.photosBefore:w.photosAfter):null;
      if(list&&Number.isInteger(action.index)&&action.index>=0&&action.index<list.length)removedKeys=[list[action.index]];
    }else if(action?.type==='workshopDelete'){
      const w=current.workshops.find((w:any)=>w.id===action.id);
      if(w)removedKeys=[...w.photosBefore,...w.photosAfter];
    }
    const roster=await activeDisplayNames();
    const state=transition(current,action,roster);
    const result=await env.DB.prepare('UPDATE demo_state SET payload=?,revision=revision+1 WHERE id=1 AND revision=?').bind(JSON.stringify(state),revision).run();
    if(!result.meta.changes)return Response.json({error:'Modification simultanée : rechargez les données.'},{status:409});
    if(removedKeys.length)await Promise.all(removedKeys.map(k=>env.MEDIA.delete(k).catch(()=>{})));
    return Response.json({state,revision:revision+1});
  }catch(e){return Response.json({error:e instanceof Error?e.message:'Enregistrement impossible.'},{status:400})}
}
