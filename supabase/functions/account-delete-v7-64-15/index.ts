import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const headers={"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers});
  if(req.method!=="POST") return json({error:"Method not allowed"},405);
  try{
    const authHeader=req.headers.get("Authorization")||"";
    if(!authHeader.startsWith("Bearer ")) return json({error:"Authentication required"},401);
    const body=await req.json().catch(()=>({}));
    if(body?.confirm!==true) return json({error:"Explicit confirmation required"},400);
    const url=Deno.env.get("SUPABASE_URL")||"";
    const publishable=Deno.env.get("SUPABASE_ANON_KEY")||Deno.env.get("SUPABASE_PUBLISHABLE_KEY")||"";
    const service=Deno.env.get("SUPABASE_SECRET_KEY")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
    if(!url||!publishable||!service) return json({error:"Server configuration unavailable"},500);
    const userClient=createClient(url,publishable,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false}});
    const {data:userData,error:userError}=await userClient.auth.getUser();
    if(userError||!userData.user) return json({error:"Authentication required"},401);
    if(userData.user.is_anonymous) return json({error:"Permanent WPI account required"},403);
    const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const uid=userData.user.id;
    const {data:members,error:memberError}=await admin.from("live_team_members").select("role").eq("user_id",uid);
    if(memberError) throw memberError;
    const privileged=(members||[]).some((m:any)=>["owner","admin","scorer"].includes(String(m.role)));
    if(privileged) return json({error:"Owner, Admin and Scorer accounts must transfer or remove team responsibilities before deletion."},409);
    const {data:clubs,error:clubError}=await admin.from("live_club_members").select("role").eq("user_id",uid);
    if(clubError) throw clubError;
    if((clubs||[]).length) return json({error:"Club-management accounts must transfer club responsibilities before deletion."},409);
    const {error:deleteError}=await admin.auth.admin.deleteUser(uid);
    if(deleteError) throw deleteError;
    return json({deleted:true});
  }catch(error){ return json({error:error instanceof Error?error.message:"Account deletion failed"},500); }
});