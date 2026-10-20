import {currentUser} from '../../../lib/auth';
import {activeDisplayNames} from '../../../lib/roster';
export async function GET(req:Request){
  const user=await currentUser(req);
  if(!user)return Response.json({error:'Connexion requise.'},{status:401});
  try{
    const people=await activeDisplayNames();
    return Response.json({people},{headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json({error:'Liste indisponible.'},{status:503})}
}
