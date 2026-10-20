import {currentUser} from '../../../lib/auth';
import {activeDisplayNames,activeDisplayNamesByRoles} from '../../../lib/roster';
export async function GET(req:Request){
  const user=await currentUser(req);
  if(!user)return Response.json({error:'Connexion requise.'},{status:401});
  try{
    const [people,workshopManagers]=await Promise.all([activeDisplayNames(),activeDisplayNamesByRoles(['Responsable',"Responsable d'atelier"])]);
    return Response.json({people,workshopManagers},{headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json({error:'Liste indisponible.'},{status:503})}
}
