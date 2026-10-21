export const APPLICATION_STAGES = ["saved","referral_requested","applied","interview","offer","rejected"] as const;
export type ApplicationStage = (typeof APPLICATION_STAGES)[number];
export type Priority = "low" | "normal" | "high";
export type ApplicationRecord = { id:string; user_id:string; company:string; role:string; stage:ApplicationStage; job_url:string|null; location:string|null; priority:Priority; applied_at:string|null; next_action:string|null; next_action_date:string|null; notes:string|null; created_at:string; updated_at:string };
export type ContactRecord = { id:string; user_id:string; name:string; company:string; role:string|null; email:string|null; linkedin_url:string|null; relationship:string|null; notes:string|null; created_at:string };
export type OutreachTemplate = { id?:string; user_id?:string; key:string; title:string; channel:"linkedin"|"email"|"follow_up"; subject:string; body:string; updated_at?:string };
export const STAGE_LABELS:Record<ApplicationStage,string> = {saved:"Saved",referral_requested:"Referral requested",applied:"Applied",interview:"Interview",offer:"Offer",rejected:"Rejected"};
export const STAGE_COLORS:Record<ApplicationStage,string> = {saved:"slate",referral_requested:"violet",applied:"blue",interview:"amber",offer:"green",rejected:"rose"};
