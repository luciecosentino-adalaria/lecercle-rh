import {currentUser} from '../../../lib/auth';

export async function GET(req:Request){
  const user=await currentUser(req);
  return Response.json({user:user?{displayName:user.displayName,username:user.username,roles:user.roles}:null});
}
