"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity, ArrowRight, BriefcaseBusiness, CalendarClock, Check, CheckCircle2, ChevronRight,
  Clipboard, Download, ExternalLink, FileUp, Filter, Handshake, LayoutDashboard, LayoutGrid, LogIn,
  LogOut, Mail, Menu, Moon, Pencil, Plus, Search, ShieldCheck, Sparkles, Sun, Trash2, Users, X,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { APPLICATION_STAGES, STAGE_COLORS, STAGE_LABELS, type ApplicationRecord, type ApplicationStage, type ContactRecord, type OutreachTemplate, type Priority, type ReferralRequestRecord, type ReferralRequestStatus } from "@/lib/types";

type Section = "overview" | "applications" | "board" | "contacts" | "referrals" | "follow-ups" | "templates";
type ToastState = { message: string; error?: boolean } | null;
const today = () => new Date().toISOString().slice(0, 10);
const daysFromNow = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
const dateLabel = (v: string | null | undefined) => {
  if (!v) return "Not set";
  const d = new Date(v.length === 10 ? v + "T12:00:00" : v);
  return Number.isNaN(d.getTime()) ? "Not set" : d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
};
const dueIn = (v: string | null | undefined) => v ? Math.round((new Date(v + "T00:00:00").getTime() - new Date(today() + "T00:00:00").getTime()) / 86400000) : null;
const initials = (s: string) => s.trim().split(/\s+/).slice(0, 2).map(x => x[0] ?? "").join("").toUpperCase() || "?";

const initialApps: ApplicationRecord[] = [
  { id:"sample-1", user_id:"", company:"Stripe", role:"Software Engineer, Product", stage:"interview", job_url:"https://stripe.com/jobs", location:"Bengaluru · Hybrid", priority:"high", applied_at:daysFromNow(-9), next_action:"Prepare for technical round", next_action_date:daysFromNow(1), notes:"Focus on product thinking and API design.", created_at:new Date().toISOString(), updated_at:new Date().toISOString() },
  { id:"sample-2", user_id:"", company:"Atlassian", role:"Software Engineer II", stage:"referral_requested", job_url:"https://atlassian.com/company/careers", location:"Remote · India", priority:"high", applied_at:null, next_action:"Follow up with Priya", next_action_date:today(), notes:"Referral contact works in the platform team.", created_at:new Date().toISOString(), updated_at:new Date().toISOString() },
  { id:"sample-3", user_id:"", company:"Microsoft", role:"Software Engineer", stage:"applied", job_url:"https://careers.microsoft.com", location:"Hyderabad · Hybrid", priority:"normal", applied_at:daysFromNow(-5), next_action:"Check application status", next_action_date:daysFromNow(3), notes:"", created_at:new Date().toISOString(), updated_at:new Date().toISOString() },
  { id:"sample-4", user_id:"", company:"Razorpay", role:"Backend Engineer", stage:"saved", job_url:"https://razorpay.com/jobs", location:"Bengaluru · On-site", priority:"normal", applied_at:null, next_action:"Ask for an internal referral", next_action_date:daysFromNow(2), notes:"Review the role requirements first.", created_at:new Date().toISOString(), updated_at:new Date().toISOString() },
  { id:"sample-5", user_id:"", company:"Adobe", role:"Computer Scientist", stage:"offer", job_url:"https://careers.adobe.com", location:"Noida · Hybrid", priority:"high", applied_at:daysFromNow(-24), next_action:"Review offer details", next_action_date:today(), notes:"Compare compensation and growth path.", created_at:new Date().toISOString(), updated_at:new Date().toISOString() },
];
const initialContacts: ContactRecord[] = [
  { id:"contact-1", user_id:"", name:"Priya Sharma", company:"Atlassian", role:"Senior Software Engineer", email:null, linkedin_url:"https://www.linkedin.com/", relationship:"Alumni", notes:"Connected through an engineering community.", created_at:new Date().toISOString() },
  { id:"contact-2", user_id:"", name:"Rahul Mehta", company:"Stripe", role:"Engineering Manager", email:null, linkedin_url:"https://www.linkedin.com/", relationship:"2nd-degree", notes:"Potential introduction for product engineering roles.", created_at:new Date().toISOString() },
  { id:"contact-3", user_id:"", name:"Aditi Verma", company:"Microsoft", role:"Technical Recruiter", email:null, linkedin_url:"https://www.linkedin.com/", relationship:"Recruiter", notes:"Recruiting for India engineering teams.", created_at:new Date().toISOString() },
];
const initialTemplates: OutreachTemplate[] = [
  { key:"linkedin_intro", title:"LinkedIn connection", channel:"linkedin", subject:"", body:"Hi {name}, I came across your work at {company} and found your journey interesting. I’m exploring {role} opportunities and would love to connect and learn from your experience. Thanks!" },
  { key:"referral_request", title:"Referral request", channel:"email", subject:"Quick question about the {role} role at {company}", body:"Hi {name},\n\nI hope you’re doing well. I’m interested in the {role} opportunity at {company} and noticed your experience with the team. If you feel my background could be a fit, would you be comfortable referring me?\n\nRole link: {job_url}\n\nNo worries if the timing isn’t right. Thank you for considering it!\n\nBest,\n{your_name}" },
  { key:"gentle_follow_up", title:"Gentle follow-up", channel:"follow_up", subject:"Following up — {role} at {company}", body:"Hi {name},\n\nI wanted to gently follow up on my note about the {role} opportunity at {company}. I know things get busy, so no pressure if you haven’t had a chance to look at it yet.\n\nThanks again for your time!\n{your_name}" },
];
const stages = APPLICATION_STAGES.map(value => ({ value, label:STAGE_LABELS[value] }));
const referralStatuses: {value:ReferralRequestStatus;label:string}[] = [{value:"draft",label:"Draft"},{value:"ready_to_send",label:"Ready to send"},{value:"requested",label:"Requested"},{value:"responded",label:"Responded"},{value:"referred",label:"Referred"},{value:"declined",label:"Declined"},{value:"closed",label:"Closed"}];

function parseCsv(text: string): Record<string, string>[] {
  const all: string[][] = []; let row:string[]=[]; let cell=""; let quoted=false;
  for (let i=0;i<text.length;i++) {
    const c=text[i];
    if(c === '"' && quoted && text[i+1] === '"'){cell+='"';i++;}
    else if(c === '"') quoted=!quoted;
    else if(c === "," && !quoted){row.push(cell.trim());cell="";}
    else if((c === "\n" || c === "\r") && !quoted){if(c==="\r"&&text[i+1]==="\n")i++;row.push(cell.trim());cell="";if(row.some(x=>x))all.push(row);row=[];}
    else cell+=c;
  }
  row.push(cell.trim()); if(row.some(x=>x))all.push(row);
  if(all.length<2)return [];
  const headers=all[0].map(x=>x.toLowerCase().replace(/[\s-]+/g,"_"));
  return all.slice(1).map(values=>Object.fromEntries(headers.map((key,i)=>[key,values[i]??""])));
}
const csvEscape = (v:unknown) => '"' + String(v??"").replace(/"/g,'""') + '"';
const toStage = (v:string):ApplicationStage => APPLICATION_STAGES.includes(v as ApplicationStage) ? v as ApplicationStage : "saved";

export default function HomePage() {
  const [section,setSection]=useState<Section>("overview");
  const [theme,setTheme]=useState<"light"|"dark">("light");
  const [apps,setApps]=useState<ApplicationRecord[]>(initialApps);
  const [contacts,setContacts]=useState<ContactRecord[]>(initialContacts);
  const [referralRequests,setReferralRequests]=useState<ReferralRequestRecord[]>([]);
  const [templates,setTemplates]=useState<OutreachTemplate[]>(initialTemplates);
  const [session,setSession]=useState<Session|null>(null);
  const [authReady,setAuthReady]=useState(!isSupabaseConfigured);
  const [search,setSearch]=useState("");
  const [stageFilter,setStageFilter]=useState("all");
  const [appModal,setAppModal]=useState(false);
  const [editApp,setEditApp]=useState<ApplicationRecord|null>(null);
  const [contactModal,setContactModal]=useState(false);
  const [editContact,setEditContact]=useState<ContactRecord|null>(null);
  const [referralModal,setReferralModal]=useState(false);
  const [editReferral,setEditReferral]=useState<ReferralRequestRecord|null>(null);
  const [authModal,setAuthModal]=useState(false);
  const [email,setEmail]=useState("");
  const [busy,setBusy]=useState(false);
  const [toast,setToast]=useState<ToastState>(null);
  const [mobileOpen,setMobileOpen]=useState(false);
  const fileRef=useRef<HTMLInputElement>(null);
  const cloudReady=isSupabaseConfigured && Boolean(session?.user);

  const notify=useCallback((message:string,error=false)=>{setToast({message,error});window.setTimeout(()=>setToast(null),3200);},[]);
  useEffect(()=>{
    if(!isSupabaseConfigured)return;
    const supabase=createClient();
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setAuthReady(true);}).catch(()=>setAuthReady(true));
    const {data:listener}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setAuthReady(true);});
    return ()=>listener.subscription.unsubscribe();
  },[]);
  useEffect(()=>{document.documentElement.dataset.theme=theme;window.localStorage.setItem("referralflow-theme",theme);},[theme]);

  const loadCloud=useCallback(async()=>{
    if(!cloudReady)return;
    const supabase=createClient();
    const [a,c,t,r]=await Promise.all([
      supabase.from("applications").select("*").order("updated_at",{ascending:false}),
      supabase.from("contacts").select("*").order("created_at",{ascending:false}),
      supabase.from("outreach_templates").select("*").order("title"),
      supabase.from("referral_requests").select("*").order("updated_at",{ascending:false}),
    ]);
    if(a.error)notify("Could not load applications: "+a.error.message,true);else setApps((a.data??[]) as ApplicationRecord[]);
    if(c.error)notify("Could not load contacts: "+c.error.message,true);else setContacts((c.data??[]) as ContactRecord[]);
    if(r.error)notify("Could not load referral requests: "+r.error.message,true);else setReferralRequests((r.data??[]) as ReferralRequestRecord[]);
    if(t.error){
      notify("Could not load templates. Apply the latest schema in Supabase.",true);
    }else if(t.data?.length){
      setTemplates(t.data as OutreachTemplate[]);
    }else{
      // Give each new account its own editable defaults instead of showing
      // preview-only templates that disappear after the next refresh.
      const defaults=initialTemplates.map(({key,title,channel,subject,body})=>({
        key,title,channel,subject,body,user_id:session!.user.id,
      }));
      const seeded=await supabase.from("outreach_templates")
        .upsert(defaults,{onConflict:"user_id,key"}).select("*").order("title");
      if(seeded.error)notify("Workspace loaded, but default templates could not be created: "+seeded.error.message,true);
      else setTemplates((seeded.data??[]) as OutreachTemplate[]);
    }
  },[cloudReady,notify,session]);
  useEffect(()=>{if(cloudReady)void Promise.resolve().then(loadCloud);},[loadCloud,cloudReady]);

  const filtered=useMemo(()=>apps.filter(a=>{
    const q=search.trim().toLowerCase();
    const found=!q||[a.company,a.role,a.location,a.notes].some(v=>(v??"").toLowerCase().includes(q));
    return found&&(stageFilter==="all"||a.stage===stageFilter);
  }).sort((a,b)=>(b.updated_at??"").localeCompare(a.updated_at??"")),[apps,search,stageFilter]);
  const followUps=useMemo(()=>apps.filter(a=>a.next_action&&a.next_action_date).sort((a,b)=>(a.next_action_date??"").localeCompare(b.next_action_date??"")),[apps]);
  const due=apps.filter(a=>{const n=dueIn(a.next_action_date);return a.next_action&&n!==null&&n<=0&&a.stage!=="rejected";}).length;
  const refs=apps.filter(a=>a.stage==="referral_requested").length;
  const interviews=apps.filter(a=>a.stage==="interview").length;
  const offers=apps.filter(a=>a.stage==="offer").length;

  async function saveApp(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const form=new FormData(e.currentTarget);
    const company=String(form.get("company")??"").trim(),role=String(form.get("role")??"").trim();
    if(!company||!role){notify("Company and role are required.",true);return;}
    const url=String(form.get("job_url")??"").trim();
    if(url&&!/^https?:\/\/.+/i.test(url)){notify("Job URL must start with http:// or https://.",true);return;}
    const p=String(form.get("priority")??"normal");
    const record={company,role,stage:toStage(String(form.get("stage")??"saved")),job_url:url||null,location:String(form.get("location")??"").trim()||null,priority:(["low","normal","high"].includes(p)?p:"normal") as Priority,applied_at:String(form.get("applied_at")??"")||null,next_action:String(form.get("next_action")??"").trim()||null,next_action_date:String(form.get("next_action_date")??"")||null,notes:String(form.get("notes")??"").trim()||null,updated_at:new Date().toISOString()};
    setBusy(true);
    if(cloudReady){
      const sb=createClient();const result=editApp?await sb.from("applications").update(record).eq("id",editApp.id).select().single():await sb.from("applications").insert({...record,user_id:session!.user.id}).select().single();
      setBusy(false);if(result.error){notify("Could not save: "+result.error.message,true);return;}
      const saved=result.data as ApplicationRecord;setApps(current=>editApp?current.map(a=>a.id===saved.id?saved:a):[saved,...current]);
    }else{
      const now=new Date().toISOString();const local:ApplicationRecord={...record,id:editApp?.id??crypto.randomUUID(),user_id:"",created_at:editApp?.created_at??now};
      setApps(current=>editApp?current.map(a=>a.id===local.id?local:a):[local,...current]);setBusy(false);
    }
    setAppModal(false);setEditApp(null);notify(editApp?"Application updated.":"Application added.");
  }
  async function deleteApp(a:ApplicationRecord){
    if(!window.confirm("Delete the "+a.role+" application at "+a.company+"? This cannot be undone."))return;
    if(cloudReady){const {error}=await createClient().from("applications").delete().eq("id",a.id);if(error){notify("Could not delete: "+error.message,true);return;}}
    setApps(current=>current.filter(x=>x.id!==a.id));notify("Application deleted.");
  }
  async function moveApp(a:ApplicationRecord,stage:ApplicationStage){
    if(a.stage===stage)return;const patch={stage,updated_at:new Date().toISOString()};
    if(cloudReady){const {data,error}=await createClient().from("applications").update(patch).eq("id",a.id).select().single();if(error){notify("Could not change stage: "+error.message,true);return;}setApps(current=>current.map(x=>x.id===a.id?data as ApplicationRecord:x));}
    else setApps(current=>current.map(x=>x.id===a.id?{...x,...patch}:x));
    notify("Moved to "+STAGE_LABELS[stage]+".");
  }
  async function saveContact(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const f=new FormData(e.currentTarget);const name=String(f.get("name")??"").trim(),company=String(f.get("company")??"").trim();
    if(!name||!company){notify("Name and company are required.",true);return;}
    const profile=String(f.get("linkedin_url")??"").trim();
    if(profile&&!/^https?:\/\/.+/i.test(profile)){notify("Profile URL must start with http:// or https://.",true);return;}
    const record={name,company,role:String(f.get("role")??"").trim()||null,email:String(f.get("email")??"").trim()||null,linkedin_url:profile||null,relationship:String(f.get("relationship")??"").trim()||null,notes:String(f.get("notes")??"").trim()||null};
    setBusy(true);
    if(cloudReady){const sb=createClient();const result=editContact?await sb.from("contacts").update(record).eq("id",editContact.id).select().single():await sb.from("contacts").insert({...record,user_id:session!.user.id}).select().single();setBusy(false);if(result.error){notify("Could not save contact: "+result.error.message,true);return;}const saved=result.data as ContactRecord;setContacts(cur=>editContact?cur.map(c=>c.id===saved.id?saved:c):[saved,...cur]);}
    else{const local:ContactRecord={...record,id:editContact?.id??crypto.randomUUID(),user_id:"",created_at:editContact?.created_at??new Date().toISOString()};setContacts(cur=>editContact?cur.map(c=>c.id===local.id?local:c):[local,...cur]);setBusy(false);}
    setContactModal(false);setEditContact(null);notify(editContact?"Contact updated.":"Contact added.");
  }
  async function deleteContact(c:ContactRecord){
    if(!window.confirm("Delete "+c.name+" from your contacts?"))return;
    if(cloudReady){const {error}=await createClient().from("contacts").delete().eq("id",c.id);if(error){notify("Could not delete contact: "+error.message,true);return;}}
    setContacts(cur=>cur.filter(x=>x.id!==c.id));notify("Contact deleted.");
  }
  async function saveReferralRequest(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!apps.length||!contacts.length){notify("Add an application and a contact before tracking a referral request.",true);return;}
    const f=new FormData(e.currentTarget);
    const application_id=String(f.get("application_id")??"");
    const contact_id=String(f.get("contact_id")??"");
    const status=String(f.get("status")??"draft") as ReferralRequestStatus;
    if(!apps.some(a=>a.id===application_id)||!contacts.some(c=>c.id===contact_id)){notify("Choose a valid application and contact.",true);return;}
    const previous=editReferral;
    const requested_at=status==="requested"?(previous?.requested_at??new Date().toISOString()):previous?.requested_at??null;
    const responded_at=["responded","referred","declined","closed"].includes(status)?(previous?.responded_at??new Date().toISOString()):previous?.responded_at??null;
    const record={application_id,contact_id,status,requested_at,responded_at,response_summary:String(f.get("response_summary")??"").trim()||null,outcome:String(f.get("outcome")??"").trim()||null,notes:String(f.get("notes")??"").trim()||null,updated_at:new Date().toISOString()};
    setBusy(true);
    if(cloudReady){
      const sb=createClient();
      const result=previous
        ? await sb.from("referral_requests").update(record).eq("id",previous.id).select().single()
        : await sb.from("referral_requests").insert({...record,user_id:session!.user.id}).select().single();
      setBusy(false);
      if(result.error){notify("Could not save referral request: "+result.error.message,true);return;}
      const saved=result.data as ReferralRequestRecord;
      setReferralRequests(cur=>previous?cur.map(x=>x.id===saved.id?saved:x):[saved,...cur]);
    }else{
      const now=new Date().toISOString();
      const local:ReferralRequestRecord={...record,id:previous?.id??crypto.randomUUID(),user_id:"",created_at:previous?.created_at??now};
      setReferralRequests(cur=>previous?cur.map(x=>x.id===local.id?local:x):[local,...cur]);
      setBusy(false);
    }
    setReferralModal(false);setEditReferral(null);notify(previous?"Referral request updated.":"Referral request tracked.");
  }
  async function changeReferralStatus(request:ReferralRequestRecord,status:ReferralRequestStatus){
    const patch={status,requested_at:status==="requested"?(request.requested_at??new Date().toISOString()):request.requested_at,responded_at:["responded","referred","declined","closed"].includes(status)?(request.responded_at??new Date().toISOString()):request.responded_at,updated_at:new Date().toISOString()};
    if(cloudReady){const {data,error}=await createClient().from("referral_requests").update(patch).eq("id",request.id).select().single();if(error){notify("Could not update status: "+error.message,true);return;}setReferralRequests(cur=>cur.map(x=>x.id===request.id?data as ReferralRequestRecord:x));}
    else setReferralRequests(cur=>cur.map(x=>x.id===request.id?{...x,...patch}:x));
    notify("Referral status updated.");
  }
  async function deleteReferralRequest(request:ReferralRequestRecord){
    if(!window.confirm("Delete this referral request?"))return;
    if(cloudReady){const {error}=await createClient().from("referral_requests").delete().eq("id",request.id);if(error){notify("Could not delete referral request: "+error.message,true);return;}}
    setReferralRequests(cur=>cur.filter(x=>x.id!==request.id));notify("Referral request deleted.");
  }
  async function saveTemplate(t:OutreachTemplate){
    if(cloudReady){const {data,error}=await createClient().from("outreach_templates").upsert({...t,user_id:session!.user.id,updated_at:new Date().toISOString()},{onConflict:"user_id,key"}).select().single();if(error){notify("Could not save template: "+error.message,true);return;}setTemplates(cur=>cur.map(x=>x.key===t.key?data as OutreachTemplate:x));}
    else setTemplates(cur=>cur.map(x=>x.key===t.key?t:x));
    notify("Template saved.");
  }
  async function signIn(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(!isSupabaseConfigured){notify("Configure Supabase keys first.",true);return;}
    setBusy(true);const {error}=await createClient().auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:window.location.origin+"/auth/callback"}});setBusy(false);
    if(error)notify("Sign-in failed: "+error.message,true);else notify("Check your inbox for a secure sign-in link.");
  }
  async function signOut(){
    if(isSupabaseConfigured){const {error}=await createClient().auth.signOut();if(error){notify("Could not sign out.",true);return;}}
    setSession(null);setApps(initialApps);setContacts(initialContacts);setTemplates(initialTemplates);notify("Signed out.");
  }
  function exportCsv(){
    const keys=["company","role","stage","job_url","location","priority","applied_at","next_action","next_action_date","notes"];
    const content=[keys.join(","),...filtered.map(a=>keys.map(k=>csvEscape(a[k as keyof ApplicationRecord])).join(","))].join("\r\n");
    const url=URL.createObjectURL(new Blob(["\uFEFF"+content],{type:"text/csv;charset=utf-8"}));const link=document.createElement("a");link.href=url;link.download="referralflow-applications-"+today()+".csv";link.click();URL.revokeObjectURL(url);notify("CSV export prepared.");
  }
  async function importCsv(file?:File){
    if(!file)return;if(file.size>2*1024*1024){notify("CSV must be smaller than 2 MB.",true);return;}
    try{
      const rows=parseCsv(await file.text());if(!rows.length)throw new Error("CSV needs a header row and at least one record.");
      if(!("company" in rows[0])||!("role" in rows[0]))throw new Error("CSV headers must include company and role.");
      const known=new Set(apps.map(a=>(a.company+"|"+a.role).toLowerCase().replace(/\s+/g," ").trim()));
      const clean:Record<string,unknown>[]=[];let duplicates=0,skipped=0;
      for(const row of rows){const company=(row.company??"").trim(),role=(row.role??"").trim();if(!company||!role){skipped++;continue;}
        const key=(company+"|"+role).toLowerCase().replace(/\s+/g," ").trim();if(known.has(key)){duplicates++;continue;}known.add(key);
        const job=(row.job_url??"").trim();const priority=["low","normal","high"].includes(row.priority??"")?row.priority:"normal";
        clean.push({company,role,stage:toStage(row.stage??"saved"),job_url:/^https?:\/\/.+/i.test(job)?job:null,location:(row.location??"").trim()||null,priority,applied_at:(row.applied_at??"").trim()||null,next_action:(row.next_action??"").trim()||null,next_action_date:(row.next_action_date??"").trim()||null,notes:(row.notes??"").trim()||null,...(cloudReady?{user_id:session!.user.id}:{user_id:""})});
      }
      if(!clean.length){notify("Nothing imported. "+duplicates+" duplicate(s), "+skipped+" incomplete row(s).",true);return;}
      if(cloudReady){const {data,error}=await createClient().from("applications").insert(clean).select();if(error)throw new Error(error.message);setApps(cur=>[...(data as ApplicationRecord[]),...cur]);}
      else{const now=new Date().toISOString();setApps(cur=>[...(clean.map(r=>({...r,id:crypto.randomUUID(),created_at:now,updated_at:now}) as ApplicationRecord)),...cur]);}
      notify("Imported "+clean.length+" row(s); skipped "+duplicates+" duplicate(s) and "+skipped+" incomplete row(s).");
    }catch(e){notify(e instanceof Error?e.message:"CSV import failed.",true);}
    finally{if(fileRef.current)fileRef.current.value="";}
  }

  const nav=[
    {id:"overview" as const,label:"Overview",icon:LayoutDashboard},
    {id:"applications" as const,label:"Applications",icon:BriefcaseBusiness,count:apps.length},
    {id:"board" as const,label:"Pipeline board",icon:LayoutGrid},
    {id:"contacts" as const,label:"Contacts",icon:Users,count:contacts.length},
    {id:"referrals" as const,label:"Referral requests",icon:Handshake,count:referralRequests.length},
    {id:"follow-ups" as const,label:"Follow-ups",icon:CalendarClock,count:due},
    {id:"templates" as const,label:"Message templates",icon:Mail},
  ];
  const title:Record<Section,string>={overview:"Your career, in motion.",applications:"Applications",board:"Pipeline board",contacts:"Your network",referrals:"Referral requests","follow-ups":"Follow-up queue",templates:"Outreach library"};
  const subtitle:Record<Section,string>={overview:"A clear view of every opportunity and the next step to take.",applications:"Keep every role, status, and next action in one reliable place.",board:"Move opportunities across stages as your search progresses.",contacts:"Build useful relationships and keep referral context close at hand.",referrals:"Track each introduction from draft to referral outcome.","follow-ups":"Small, timely actions can keep good opportunities moving.",templates:"Reusable, editable messages that still sound like you."};
  const previewName=session?.user.email?.split("@")[0]?.replace(/[._-]+/g," ")??"Your workspace";
  const changeSection=(s:Section)=>{setSection(s);setMobileOpen(false);setStageFilter("all");};

  if(!authReady)return <div className="loading-screen"><div className="brand-mark"><Handshake size={20}/></div><p>Preparing your workspace…</p></div>;

  return <div className="app-frame">
    <div className={"mobile-overlay "+(mobileOpen?"shown":"")} onClick={()=>setMobileOpen(false)} aria-hidden="true"/>
    <aside className={"sidebar "+(mobileOpen?"mobile-open":"")} aria-label="Primary navigation">
      <div className="brand"><div className="brand-mark"><Handshake size={20}/></div><div><div className="brand-name">ReferralFlow</div><div className="brand-caption">Your career command center</div></div></div>
      <div className="nav-label">Workspace</div><nav className="nav-list">{nav.map(n=>{const I=n.icon;return <button key={n.id} className={"nav-item "+(section===n.id?"active":"")} onClick={()=>changeSection(n.id)} aria-current={section===n.id?"page":undefined}><I size={17}/><span>{n.label}</span>{n.count!==undefined&&n.count>0&&<span className="nav-count">{n.count}</span>}</button>;})}</nav>
      <div className="sidebar-spacer"/>
      <div className="tip-card"><div className="tip-title"><Sparkles size={15}/>Keep it moving</div><p>One thoughtful follow-up is often better than ten unanswered tabs.</p><button className="text-button" onClick={()=>changeSection("follow-ups")}>See next actions <ArrowRight size={13}/></button></div>
      <div className="account-row"><div className="avatar">{initials(session?.user.email??"Demo")}</div><div className="account-copy"><strong>{session?previewName:"Demo workspace"}</strong><span>{session?.user.email??(isSupabaseConfigured?"Sign in to sync":"Preview · Not synced")}</span></div><button className="icon-button tiny-icon" aria-label={session?"Sign out":"Sign in"} title={session?"Sign out":"Sign in"} onClick={()=>session?void signOut():setAuthModal(true)}>{session?<LogOut size={15}/>:<LogIn size={15}/>}</button></div>
    </aside>
    <main className="main-shell">
      <header className="topbar"><div className="crumb"><button className="icon-button mobile-menu" onClick={()=>setMobileOpen(true)} aria-label="Open navigation"><Menu size={17}/></button><span>Workspace</span><ChevronRight size={13}/><strong>{nav.find(n=>n.id===section)?.label}</strong></div><div className="top-actions"><label className="search-box"><Search size={15}/><input aria-label="Search this workspace" placeholder="Search companies, roles…" value={search} onChange={e=>setSearch(e.target.value)}/><span className="shortcut">⌘ K</span></label><button className="icon-button" title={theme==="light"?"Switch to dark mode":"Switch to light mode"} aria-label={theme==="light"?"Switch to dark mode":"Switch to light mode"} onClick={()=>setTheme(t=>t==="light"?"dark":"light")}>{theme==="light"?<Moon size={16}/>:<Sun size={16}/>}</button><button className="icon-button" title={session?"Account connected":"Sign in to sync"} aria-label="Account" onClick={()=>session?notify("Signed in as "+session.user.email):setAuthModal(true)}>{session?<ShieldCheck size={16} color="var(--green)"/>:<Users size={16}/>}</button></div></header>
      <div className="page-content">
        {!cloudReady&&<div className="preview-notice"><Activity size={15}/><div><strong>{isSupabaseConfigured?"Preview mode · Sign in to sync":"Preview mode · Cloud not configured"}</strong> — {isSupabaseConfigured?"These edits are temporary until you sign in.":"Sample records are illustrative; edits are in-memory only and disappear after refresh."} {isSupabaseConfigured?<button className="text-button inline" onClick={()=>setAuthModal(true)}>Sign in <ArrowRight size={12}/></button>:<a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Set up Supabase <ExternalLink size={11}/></a>}</div></div>}
        <div className="page-heading"><div><div className="eyebrow">{section==="overview"?"Wednesday · "+new Date().toLocaleDateString("en-IN",{month:"long",day:"numeric"}):"Your workspace"}</div><h1>{section==="overview"?"Good evening"+(session?", "+previewName.split(" ")[0]:"")+".":title[section]}</h1><p>{subtitle[section]}</p></div><div className="heading-actions">
          {section==="applications"&&<><input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={e=>void importCsv(e.target.files?.[0])}/><button className="button" onClick={()=>fileRef.current?.click()}><FileUp size={15}/>Import CSV</button><button className="button" onClick={exportCsv}><Download size={15}/>Export</button></>}
          {["overview","applications","board"].includes(section)&&<button className="button primary" onClick={()=>{setEditApp(null);setAppModal(true);}}><Plus size={16}/>Add application</button>}
          {section==="contacts"&&<button className="button primary" onClick={()=>{setEditContact(null);setContactModal(true);}}><Plus size={16}/>Add contact</button>}
          {section==="referrals"&&<button className="button primary" onClick={()=>{setEditReferral(null);setReferralModal(true);}}><Plus size={16}/>Track referral</button>}
        </div></div>

        {section==="overview"&&<>
          <div className="kpi-grid">
            <Kpi label="Applications" value={apps.length} detail="Across all stages" icon={<BriefcaseBusiness size={16}/>} note="Every opportunity, organized"/>
            <Kpi label="Referral requests" value={refs} detail="In progress" icon={<Handshake size={16}/>} note="Keep relationships warm"/>
            <Kpi label="Follow-ups due" value={due} detail="Today or overdue" icon={<CalendarClock size={16}/>} note={due?"A good time to take action":"You’re caught up for now"}/>
            <Kpi label="Interviews & offers" value={interviews+offers} detail={interviews+" interview"+(interviews===1?"":"s")+" · "+offers+" offer"+(offers===1?"":"s")} icon={<Sparkles size={16}/>} note="Progress worth celebrating"/>
          </div>
          <div className="dashboard-grid">
            <section className="panel"><PanelHeader title="Recent applications" subtitle="The latest roles in your pipeline" action="View all" onAction={()=>changeSection("applications")}/><AppTable rows={filtered.slice(0,5)} onEdit={a=>{setEditApp(a);setAppModal(true);}} onDelete={deleteApp} onMove={moveApp}/>{!filtered.length&&<Empty title="No matching applications" text="Try another search or add an opportunity." action="Add application" onAction={()=>{setEditApp(null);setAppModal(true);}}/>}</section>
            <section className="panel"><PanelHeader title="Next actions" subtitle="A little momentum goes a long way" action="All actions" onAction={()=>changeSection("follow-ups")}/><div className="action-list">{followUps.slice(0,5).map(a=>{const d=dueIn(a.next_action_date);return <div className="action-row" key={a.id}><div className="action-icon"><CalendarClock size={15}/></div><div className="action-copy"><strong>{a.next_action}</strong><span>{a.role} · {a.company}</span><small>{dateLabel(a.next_action_date)} {d!==null&&d<=0&&<em className={d<0?"overdue":""}>{d<0?Math.abs(d)+"d overdue":"Due today"}</em>}</small></div><button className="plain-icon" aria-label="Edit follow-up" onClick={()=>{setEditApp(a);setAppModal(true);}}><ChevronRight size={15}/></button></div>;})}{!followUps.length&&<Empty title="All clear for now" text="Add a next action and date to an application."/>}</div></section>
          </div>
          <div className="dashboard-grid below-grid">
            <section className="panel"><PanelHeader title="Pipeline snapshot" subtitle="Where opportunities stand" action="Open board" onAction={()=>changeSection("board")}/><div className="progress-list">{APPLICATION_STAGES.filter(s=>apps.some(a=>a.stage===s)||["saved","applied","interview","offer"].includes(s)).map(s=>{const count=apps.filter(a=>a.stage===s).length;const percent=apps.length?Math.round(count/apps.length*100):0;return <div className="progress-row" key={s}><div><span>{STAGE_LABELS[s]}</span><strong>{count} <small>· {percent}%</small></strong></div><div className="progress-track"><span style={{width:percent+"%"}}/></div></div>;})}</div></section>
            <section className="panel"><PanelHeader title="Network at a glance" subtitle="People behind possible introductions" action="Contacts" onAction={()=>changeSection("contacts")}/><div className="action-list">{contacts.slice(0,3).map(c=><div className="action-row" key={c.id}><div className="avatar">{initials(c.name)}</div><div className="action-copy"><strong>{c.name}</strong><span>{c.role||"Contact"} · {c.company}</span><small>{c.relationship||"Relationship not set"}</small></div>{c.linkedin_url&&<a className="plain-icon" href={c.linkedin_url} target="_blank" rel="noreferrer" aria-label="Open LinkedIn"><ExternalLink size={14}/></a>}</div>)}{!contacts.length&&<Empty title="Your network starts here" text="Add a contact to keep referral context close by." action="Add contact" onAction={()=>setContactModal(true)}/>}</div></section>
          </div>
        </>}

        {section==="applications"&&<section className="panel"><PanelHeader title="All applications" subtitle="A searchable, editable record of your job search." side={<button className="button small" onClick={()=>changeSection("board")}><LayoutGrid size={14}/>Board view</button>}/><div className="toolbar"><Filter size={14}/><span>Stage</span><select className="select-control" aria-label="Filter stage" value={stageFilter} onChange={e=>setStageFilter(e.target.value)}><option value="all">All stages</option>{stages.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select><small>{filtered.length} of {apps.length} records</small></div><AppTable rows={filtered} onEdit={a=>{setEditApp(a);setAppModal(true);}} onDelete={deleteApp} onMove={moveApp}/>{!filtered.length&&<Empty title="No applications found" text={apps.length?"Change your filters or search terms.":"Add your first role or import a CSV."} action="Add application" onAction={()=>setAppModal(true)}/>}</section>}

        {section==="board"&&<div className="board">{APPLICATION_STAGES.map(stage=>{const rows=apps.filter(a=>a.stage===stage&&(!search||(a.company+" "+a.role).toLowerCase().includes(search.toLowerCase())));return <div className="board-column" key={stage} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData("text/plain");const a=apps.find(x=>x.id===id);if(a)void moveApp(a,stage);}}><div className="board-heading"><span className={"status "+STAGE_COLORS[stage]}>{STAGE_LABELS[stage]}</span><span className="count">{rows.length}</span></div>{rows.map(a=><article className="board-card" draggable key={a.id} onDragStart={e=>e.dataTransfer.setData("text/plain",a.id)}><div className="board-company"><div className="company-logo">{initials(a.company)}</div><div><strong>{a.company}</strong><span>{a.role}</span></div><button className="plain-icon" aria-label="Edit application" onClick={()=>{setEditApp(a);setAppModal(true);}}><Pencil size={13}/></button></div><div className="card-bottom"><span className={"priority "+a.priority}>● {a.priority}</span><span>{dateLabel(a.next_action_date)}</span></div>{a.next_action&&<p>{a.next_action}</p>}</article>)}{!rows.length&&<div className="column-empty">Drop a card here</div>}</div>;})}</div>}


        {section==="referrals"&&<section className="panel"><PanelHeader title="Referral pipeline" subtitle="Track the request, response, and outcome for each introduction." side={<span className="status violet">{referralRequests.length} tracked</span>}/>{referralRequests.length?<div className="table-wrap"><table className="data-table"><thead><tr><th>Opportunity</th><th>Contact</th><th>Status</th><th>Requested</th><th>Response / outcome</th><th/></tr></thead><tbody>{referralRequests.map(request=>{const app=apps.find(a=>a.id===request.application_id);const contact=contacts.find(c=>c.id===request.contact_id);return <tr key={request.id}><td><strong>{app?.company??"Application"}</strong><small>{app?.role??"Linked application unavailable"}</small></td><td><strong>{contact?.name??"Contact"}</strong><small>{contact?.company??""}</small></td><td><select aria-label={"Status for "+(app?.company??"referral")} className="select-control" value={request.status} onChange={e=>void changeReferralStatus(request,e.target.value as ReferralRequestStatus)}>{referralStatuses.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></td><td>{dateLabel(request.requested_at)}</td><td><span>{request.response_summary||request.outcome||request.notes||"—"}</span></td><td><div className="row-actions"><button className="plain-icon" aria-label="Edit referral request" onClick={()=>{setEditReferral(request);setReferralModal(true);}}><Pencil size={14}/></button><button className="plain-icon" aria-label="Delete referral request" onClick={()=>void deleteReferralRequest(request)}><Trash2 size={14}/></button></div></td></tr>;})}</tbody></table></div>:<Empty title="No referral requests yet" text="Pair a role with someone in your network and track the request through to an outcome." action="Track referral" onAction={()=>{setEditReferral(null);setReferralModal(true);}}/>}</section>}

        {section==="contacts"&&<>{contacts.filter(c=>!search||[c.name,c.company,c.role,c.email].some(v=>(v??"").toLowerCase().includes(search.toLowerCase()))).length?<div className="contact-grid">{contacts.filter(c=>!search||[c.name,c.company,c.role,c.email].some(v=>(v??"").toLowerCase().includes(search.toLowerCase()))).map(c=><article className="contact-card" key={c.id}><div className="contact-top"><div className="contact-avatar">{initials(c.name)}</div><div className="contact-title"><strong>{c.name}</strong><span>{c.role||"Contact"} · {c.company}</span></div><button className="plain-icon" aria-label="Edit contact" onClick={()=>{setEditContact(c);setContactModal(true);}}><Pencil size={14}/></button><button className="plain-icon" aria-label="Delete contact" onClick={()=>void deleteContact(c)}><Trash2 size={14}/></button></div><div className="contact-details">{c.email&&<span><Mail size={13}/>{c.email}</span>}{c.linkedin_url&&<a href={c.linkedin_url} target="_blank" rel="noreferrer"><ExternalLink size={13}/>LinkedIn profile</a>}{c.relationship&&<span><Users size={13}/>{c.relationship}</span>}</div>{c.notes&&<p>{c.notes}</p>}</article>)}</div>:<section className="panel"><Empty title="Your network starts here" text="Add people you know at companies you’re interested in. Keep their role, profile, and conversation context together." action="Add contact" onAction={()=>setContactModal(true)}/></section>}</>}

        {section==="follow-ups"&&<section className="panel"><PanelHeader title="Your follow-up list" subtitle="Dates are based on the next action set on each application." side={<span className="status amber">{due} due now</span>}/><div className="table-wrap"><table className="data-table"><thead><tr><th>Next action</th><th>Company / role</th><th>Due date</th><th>Stage</th><th>Priority</th><th/></tr></thead><tbody>{followUps.filter(a=>!search||(a.company+" "+a.role+" "+a.next_action).toLowerCase().includes(search.toLowerCase())).map(a=>{const d=dueIn(a.next_action_date);return <tr key={a.id}><td><strong>{a.next_action}</strong></td><td><strong>{a.company}</strong><small>{a.role}</small></td><td><span className={"due-label "+(d!==null&&d<0?"overdue":"")}>{d!==null&&d<0?Math.abs(d)+" days overdue":d===0?"Today":dateLabel(a.next_action_date)}</span></td><td><span className={"status "+STAGE_COLORS[a.stage]}>{STAGE_LABELS[a.stage]}</span></td><td><span className={"priority "+a.priority}>● {a.priority}</span></td><td><button className="plain-icon" aria-label="Edit follow-up" onClick={()=>{setEditApp(a);setAppModal(true);}}><Pencil size={14}/></button></td></tr>;})}</tbody></table></div>{!followUps.length&&<Empty title="Nothing on the calendar yet" text="Add a next action and date to an application to keep this queue updated." action="Add application" onAction={()=>setAppModal(true)}/>}</section>}

        {section==="templates"&&<><div className="preview-notice"><Sparkles size={15}/><div><strong>Make it personal.</strong> Replace placeholders like <code>{"{name}"}</code> and <code>{"{company}"}</code> before sending. ReferralFlow never sends messages automatically.</div></div><div className="template-grid">{templates.map(t=><TemplateCard key={t.key+":"+(t.updated_at??"preview")} template={t} onSave={saveTemplate} onCopy={async text=>{try{await navigator.clipboard.writeText(text);notify("Message copied to clipboard.");}catch{notify("Clipboard permission was blocked.",true);}}}/>)}</div></>}
        <footer className="app-footer">Built for thoughtful job searching · Your data stays private to your account when cloud sync is configured.</footer>
      </div>
    </main>
    {appModal&&<AppModal key={editApp?.id??"new"} app={editApp} busy={busy} onClose={()=>{setAppModal(false);setEditApp(null);}} onSubmit={saveApp}/>}
    {contactModal&&<ContactModal key={editContact?.id??"new-contact"} contact={editContact} busy={busy} onClose={()=>{setContactModal(false);setEditContact(null);}} onSubmit={saveContact}/>}
    {referralModal&&<ReferralModal key={editReferral?.id??"new-referral"} request={editReferral} applications={apps} contacts={contacts} busy={busy} onClose={()=>{setReferralModal(false);setEditReferral(null);}} onSubmit={saveReferralRequest}/>}
    {authModal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setAuthModal(false);}}><section className="modal modal-narrow" role="dialog" aria-modal="true" aria-labelledby="auth-title"><div className="modal-head"><div><h2 id="auth-title">Your workspace, synced</h2><p>Sign in to securely access your data across devices.</p></div><button className="icon-button" aria-label="Close" onClick={()=>setAuthModal(false)}><X size={16}/></button></div><form className="modal-form" onSubmit={e=>void signIn(e)}><div className="auth-symbol"><ShieldCheck size={23}/></div><h2>Welcome back</h2><p>We’ll email you a secure sign-in link. No password to remember.</p><label className="field"><span>Email address</span><input type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/></label><button className="button primary full-width" type="submit" disabled={busy||!isSupabaseConfigured}>{busy?"Sending link…":<><Mail size={15}/>Email me a sign-in link</>}</button>{!isSupabaseConfigured&&<p className="modal-note">Add your Supabase project URL and publishable key to the environment first.</p>}<p className="modal-note">Your records are protected by database-level row policies. Messages are never sent automatically.</p></form></section></div>}
    {toast&&<div className={"toast "+(toast.error?"error":"")} role="status" aria-live="polite">{toast.error?<Activity size={17}/>:<CheckCircle2 size={17}/>}<span>{toast.message}</span></div>}
  </div>;
}

function Kpi({label,value,detail,icon,note}:{label:string;value:number;detail:string;icon:ReactNode;note:string}){
  return <article className="kpi-card"><div className="kpi-top"><span>{label}</span><span className="kpi-icon">{icon}</span></div><div className="kpi-value-row"><strong>{value}</strong><small>{detail}</small></div><div className="kpi-note">{note}</div></article>;
}
function PanelHeader({title,subtitle,action,onAction,side}:{title:string;subtitle:string;action?:string;onAction?:()=>void;side?:ReactNode}){
  return <div className="panel-header"><div><h2>{title}</h2><p>{subtitle}</p></div>{side??(action&&onAction?<button className="text-button" onClick={onAction}>{action}<ArrowRight size={13}/></button>:null)}</div>;
}
function Empty({title,text,action,onAction}:{title:string;text:string;action?:string;onAction?:()=>void}){
  return <div className="empty-state"><div className="empty-symbol"><BriefcaseBusiness size={20}/></div><h3>{title}</h3><p>{text}</p>{action&&onAction&&<button className="button small" onClick={onAction}><Plus size={13}/>{action}</button>}</div>;
}
function AppTable({rows,onEdit,onDelete,onMove}:{rows:ApplicationRecord[];onEdit:(a:ApplicationRecord)=>void;onDelete:(a:ApplicationRecord)=>void;onMove:(a:ApplicationRecord,s:ApplicationStage)=>void}){
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>Company / role</th><th>Stage</th><th>Priority</th><th>Next action</th><th>Applied</th><th/></tr></thead><tbody>{rows.map(a=><tr key={a.id}><td><div className="company-cell"><div className="company-logo">{initials(a.company)}</div><div><strong>{a.company}</strong><small>{a.role}</small></div></div></td><td><select className={"status-select "+STAGE_COLORS[a.stage]} aria-label={"Change stage for "+a.company} value={a.stage} onChange={e=>onMove(a,e.target.value as ApplicationStage)}>{stages.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></td><td><span className={"priority "+a.priority}>● {a.priority}</span></td><td><strong className="table-action-text">{a.next_action||"—"}</strong><small>{dateLabel(a.next_action_date)}</small></td><td>{dateLabel(a.applied_at)}</td><td><div className="table-actions"><button className="plain-icon" title="Edit" aria-label={"Edit "+a.company} onClick={()=>onEdit(a)}><Pencil size={13}/></button><button className="plain-icon" title="Delete" aria-label={"Delete "+a.company} onClick={()=>onDelete(a)}><Trash2 size={13}/></button>{a.job_url&&<a className="plain-icon" title="Open job link" href={a.job_url} target="_blank" rel="noreferrer" aria-label="Open job link"><ExternalLink size={13}/></a>}</div></td></tr>)}</tbody></table></div>;
}
function AppModal({app,busy,onClose,onSubmit}:{app:ApplicationRecord|null;busy:boolean;onClose:()=>void;onSubmit:(e:FormEvent<HTMLFormElement>)=>void}){
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="app-title"><div className="modal-head"><div><h2 id="app-title">{app?"Update application":"Add an opportunity"}</h2><p>Capture enough context to know what to do next.</p></div><button className="icon-button" aria-label="Close" onClick={onClose}><X size={16}/></button></div><form className="modal-form" onSubmit={onSubmit}><div className="form-grid">
  <label className="field"><span>Company <i>*</i></span><input name="company" required maxLength={120} autoFocus placeholder="e.g. Stripe" defaultValue={app?.company??""}/></label>
  <label className="field"><span>Role / job title <i>*</i></span><input name="role" required maxLength={160} placeholder="e.g. Software Engineer" defaultValue={app?.role??""}/></label>
  <label className="field"><span>Pipeline stage</span><select name="stage" defaultValue={app?.stage??"saved"}>{stages.map(s=><option value={s.value} key={s.value}>{s.label}</option>)}</select></label>
  <label className="field"><span>Priority</span><select name="priority" defaultValue={app?.priority??"normal"}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></label>
  <label className="field full"><span>Job posting URL</span><input type="url" name="job_url" placeholder="https://…" defaultValue={app?.job_url??""}/></label>
  <label className="field"><span>Location / work style</span><input name="location" maxLength={120} placeholder="e.g. Gurugram · Hybrid" defaultValue={app?.location??""}/></label>
  <label className="field"><span>Date applied</span><input type="date" name="applied_at" defaultValue={app?.applied_at??""}/></label>
  <label className="field full"><span>Next action</span><input name="next_action" maxLength={240} placeholder="e.g. Follow up with referral contact" defaultValue={app?.next_action??""}/></label>
  <label className="field"><span>Action due date</span><input type="date" name="next_action_date" defaultValue={app?.next_action_date??""}/></label>
  <label className="field"><span>Notes</span><textarea name="notes" maxLength={4000} placeholder="Referral context, prep, or other notes" defaultValue={app?.notes??""}/></label>
  </div><div className="form-footer"><span className="form-note"><i>*</i> Required fields</span><div><button className="button" type="button" onClick={onClose}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy?"Saving…":<><Check size={14}/>{app?"Save changes":"Add application"}</>}</button></div></div></form></section></div>;
}

function ReferralModal({request,applications,contacts,busy,onClose,onSubmit}:{request:ReferralRequestRecord|null;applications:ApplicationRecord[];contacts:ContactRecord[];busy:boolean;onClose:()=>void;onSubmit:(e:FormEvent<HTMLFormElement>)=>void}){
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section className="modal modal-narrow" role="dialog" aria-modal="true" aria-labelledby="referral-title"><div className="modal-head"><div><h2 id="referral-title">{request?"Update referral request":"Track a referral request"}</h2><p>Connect a role with someone who may be able to help.</p></div><button className="icon-button" aria-label="Close" onClick={onClose}><X size={16}/></button></div><form className="modal-form" onSubmit={onSubmit}><label className="field"><span>Application</span><select name="application_id" required defaultValue={request?.application_id??applications[0]?.id??""}>{applications.map(a=><option key={a.id} value={a.id}>{a.company} — {a.role}</option>)}</select></label><label className="field"><span>Contact</span><select name="contact_id" required defaultValue={request?.contact_id??contacts[0]?.id??""}>{contacts.map(c=><option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}</select></label><label className="field"><span>Status</span><select name="status" defaultValue={request?.status??"draft"}>{referralStatuses.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label><label className="field"><span>Response summary</span><input name="response_summary" defaultValue={request?.response_summary??""} placeholder="e.g. Asked for an updated resume"/></label><label className="field"><span>Outcome</span><input name="outcome" defaultValue={request?.outcome??""} placeholder="e.g. Referral submitted"/></label><label className="field"><span>Notes</span><textarea name="notes" rows={3} defaultValue={request?.notes??""} placeholder="Context, next step, or what you discussed"/></label><div className="modal-actions"><button type="button" className="button" onClick={onClose}>Cancel</button><button type="submit" className="button primary" disabled={busy||!applications.length||!contacts.length}>{busy?"Saving…":request?"Save changes":"Track request"}</button></div>{(!applications.length||!contacts.length)&&<p className="modal-note">Add at least one application and one contact before tracking a referral.</p>}</form></section></div>;
}

function ContactModal({contact,busy,onClose,onSubmit}:{contact:ContactRecord|null;busy:boolean;onClose:()=>void;onSubmit:(e:FormEvent<HTMLFormElement>)=>void}){
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section className="modal modal-narrow" role="dialog" aria-modal="true" aria-labelledby="contact-title"><div className="modal-head"><div><h2 id="contact-title">{contact?"Edit contact":"Add to your network"}</h2><p>Keep the useful context close by.</p></div><button className="icon-button" aria-label="Close" onClick={onClose}><X size={16}/></button></div><form className="modal-form" onSubmit={onSubmit}><div className="form-grid">
  <label className="field full"><span>Full name <i>*</i></span><input name="name" autoFocus required maxLength={120} placeholder="e.g. Priya Sharma" defaultValue={contact?.name??""}/></label>
  <label className="field"><span>Company <i>*</i></span><input name="company" required maxLength={120} placeholder="e.g. Atlassian" defaultValue={contact?.company??""}/></label>
  <label className="field"><span>Role</span><input name="role" maxLength={160} placeholder="e.g. Senior Engineer" defaultValue={contact?.role??""}/></label>
  <label className="field full"><span>LinkedIn profile</span><input name="linkedin_url" type="url" placeholder="https://linkedin.com/in/…" defaultValue={contact?.linkedin_url??""}/></label>
  <label className="field"><span>Email (optional)</span><input name="email" type="email" maxLength={254} placeholder="name@company.com" defaultValue={contact?.email??""}/></label>
  <label className="field"><span>Relationship</span><select name="relationship" defaultValue={contact?.relationship??""}><option value="">Choose one</option>{["Alumni","Former colleague","Recruiter","1st-degree","2nd-degree","Community","Other"].map(x=><option key={x}>{x}</option>)}</select></label>
  <label className="field full"><span>Context / notes</span><textarea name="notes" maxLength={3000} placeholder="How you met, their team, topics to mention…" defaultValue={contact?.notes??""}/></label>
  </div><div className="form-footer"><span className="form-note"><i>*</i> Required fields</span><div><button className="button" type="button" onClick={onClose}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy?"Saving…":<><Check size={14}/>{contact?"Save contact":"Add contact"}</>}</button></div></div></form></section></div>;
}
function TemplateCard({template,onSave,onCopy}:{template:OutreachTemplate;onSave:(t:OutreachTemplate)=>void;onCopy:(text:string)=>Promise<void>}){
  const [draft,setDraft]=useState(template);
  const dirty=draft.title!==template.title||draft.subject!==template.subject||draft.body!==template.body;
  return <section className="template-card"><div className="template-head"><div><h3>{template.title}</h3><p>Edit once, personalize before sending.</p></div><span className="template-chip">{template.channel.replace("_"," ")}</span></div><label className="field"><span>Template title</span><input value={draft.title} maxLength={120} onChange={e=>setDraft(d=>({...d,title:e.target.value}))}/></label>{draft.channel!=="linkedin"&&<label className="field"><span>Subject</span><input value={draft.subject} maxLength={180} onChange={e=>setDraft(d=>({...d,subject:e.target.value}))}/></label>}<label className="field"><span>Message body</span><textarea className="template-body" maxLength={5000} value={draft.body} onChange={e=>setDraft(d=>({...d,body:e.target.value}))}/></label><div className="template-footer"><span>{draft.body.length} characters · {dirty?"Unsaved edits":"Saved"}</span><div><button className="button small" onClick={()=>void onCopy(draft.body)}><Clipboard size={13}/>Copy</button><button className="button primary small" disabled={!dirty||!draft.title.trim()||!draft.body.trim()} onClick={()=>onSave(draft)}><Check size={13}/>Save</button></div></div></section>;
}
