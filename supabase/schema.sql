-- ReferralFlow schema. Run in Supabase SQL Editor. Safe to re-run.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.applications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 company text not null check(length(trim(company)) between 1 and 120),
 role text not null check(length(trim(role)) between 1 and 160),
 stage text not null default 'saved' check(stage in ('saved','referral_requested','applied','interview','offer','rejected')),
 job_url text check(job_url is null or job_url ~* '^https?://'),
 location text, priority text not null default 'normal' check(priority in ('low','normal','high')),
 applied_at date, next_action text, next_action_date date, notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(id,user_id)
);
create index if not exists applications_user_updated on public.applications(user_id,updated_at desc);
create index if not exists applications_user_stage on public.applications(user_id,stage);
create index if not exists applications_due on public.applications(user_id,next_action_date) where next_action_date is not null;

create table if not exists public.contacts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 120), company text not null check(length(trim(company)) between 1 and 120),
 role text, email text, linkedin_url text check(linkedin_url is null or linkedin_url ~* '^https?://'),
 relationship text, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(id,user_id)
);
create index if not exists contacts_user_company on public.contacts(user_id,company);

create table if not exists public.application_contacts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 application_id uuid not null, contact_id uuid not null, relationship_note text, created_at timestamptz not null default now(),
 unique(application_id,contact_id),
 foreign key(application_id,user_id) references public.applications(id,user_id) on delete cascade,
 foreign key(contact_id,user_id) references public.contacts(id,user_id) on delete cascade
);
create index if not exists application_contacts_application_user_idx on public.application_contacts(application_id,user_id);
create index if not exists application_contacts_contact_user_idx on public.application_contacts(contact_id,user_id);

create index if not exists application_contacts_user_id_idx on public.application_contacts(user_id);

create table if not exists public.referral_requests (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 application_id uuid not null, contact_id uuid not null,
 status text not null default 'draft' check(status in ('draft','ready_to_send','referred','in_review','interview','hired','rejected','closed')),
 requested_at timestamptz, responded_at timestamptz, response_summary text, outcome text, notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(id,user_id),
 foreign key(application_id,user_id) references public.applications(id,user_id) on delete cascade,
 foreign key(contact_id,user_id) references public.contacts(id,user_id) on delete cascade
);
-- Keep this schema safe to re-run when upgrading from the earlier "request a referral" workflow.
alter table public.referral_requests drop constraint if exists referral_requests_status_check;
update public.referral_requests set status = case status
 when 'requested' then 'referred'
 when 'responded' then 'in_review'
 when 'declined' then 'rejected'
 else status end
where status in ('requested','responded','declined');
alter table public.referral_requests add constraint referral_requests_status_check
 check(status in ('draft','ready_to_send','referred','in_review','interview','hired','rejected','closed'));
create index if not exists referral_requests_user_status on public.referral_requests(user_id,status);
create index if not exists referral_requests_application_user_idx on public.referral_requests(application_id,user_id);
create index if not exists referral_requests_contact_user_idx on public.referral_requests(contact_id,user_id);
create unique index if not exists referral_requests_unique_person_opportunity on public.referral_requests(user_id,application_id,contact_id);

create table if not exists public.follow_ups (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 application_id uuid, contact_id uuid, referral_request_id uuid,
 title text not null check(length(trim(title)) between 1 and 240), due_at timestamptz not null,
 status text not null default 'open' check(status in ('open','completed','snoozed','cancelled')),
 kind text not null default 'follow_up' check(kind in ('follow_up','interview_prep','application_check','thank_you','other')),
 completed_at timestamptz, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint follow_ups_has_target check(application_id is not null or contact_id is not null or referral_request_id is not null),
 foreign key(application_id,user_id) references public.applications(id,user_id) on delete cascade,
 foreign key(contact_id,user_id) references public.contacts(id,user_id) on delete cascade,
 foreign key(referral_request_id,user_id) references public.referral_requests(id,user_id) on delete cascade
);
create index if not exists follow_ups_user_due on public.follow_ups(user_id,due_at) where status='open';
create index if not exists follow_ups_application_user_idx on public.follow_ups(application_id,user_id) where application_id is not null;
create index if not exists follow_ups_contact_user_idx on public.follow_ups(contact_id,user_id) where contact_id is not null;
create index if not exists follow_ups_referral_user_idx on public.follow_ups(referral_request_id,user_id) where referral_request_id is not null;

create table if not exists public.outreach_templates (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 key text not null check(length(trim(key)) between 1 and 80), title text not null check(length(trim(title)) between 1 and 120),
 channel text not null check(channel in ('linkedin','email','follow_up')), subject text not null default '',
 body text not null check(length(trim(body)) between 1 and 5000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,key)
);

create table if not exists public.activity_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 entity_type text not null check(entity_type in ('application','contact','referral_request','follow_up','template')),
 entity_id uuid, action text not null check(length(trim(action)) between 1 and 120),
 summary text not null check(length(trim(summary)) between 1 and 500), metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists activity_user_created on public.activity_events(user_id,created_at desc);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,display_name)
 values(new.id,coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)))
 on conflict(id) do nothing;
 return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end;
$$;
drop trigger if exists applications_updated_at on public.applications;
create trigger applications_updated_at before update on public.applications for each row execute procedure public.set_updated_at();
drop trigger if exists contacts_updated_at on public.contacts;
create trigger contacts_updated_at before update on public.contacts for each row execute procedure public.set_updated_at();
drop trigger if exists referral_requests_updated_at on public.referral_requests;
create trigger referral_requests_updated_at before update on public.referral_requests for each row execute procedure public.set_updated_at();
drop trigger if exists follow_ups_updated_at on public.follow_ups;
create trigger follow_ups_updated_at before update on public.follow_ups for each row execute procedure public.set_updated_at();
drop trigger if exists outreach_templates_updated_at on public.outreach_templates;
create trigger outreach_templates_updated_at before update on public.outreach_templates for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles for select using((select auth.uid())=id);
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update using((select auth.uid())=id) with check((select auth.uid())=id);

alter table public.applications enable row level security;
drop policy if exists "Users manage own applications" on public.applications;
create policy "Users manage own applications" on public.applications for all using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
alter table public.contacts enable row level security;
drop policy if exists "Users manage own contacts" on public.contacts;
create policy "Users manage own contacts" on public.contacts for all using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
alter table public.application_contacts enable row level security;
drop policy if exists "Users manage own application contacts" on public.application_contacts;
create policy "Users manage own application contacts" on public.application_contacts for all using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
alter table public.referral_requests enable row level security;
drop policy if exists "Users manage own referral requests" on public.referral_requests;
create policy "Users manage own referral requests" on public.referral_requests for all using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
alter table public.follow_ups enable row level security;
drop policy if exists "Users manage own follow ups" on public.follow_ups;
create policy "Users manage own follow ups" on public.follow_ups for all using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
alter table public.outreach_templates enable row level security;
drop policy if exists "Users manage own templates" on public.outreach_templates;
create policy "Users manage own templates" on public.outreach_templates for all using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
alter table public.activity_events enable row level security;
drop policy if exists "Users read own activity" on public.activity_events;
create policy "Users read own activity" on public.activity_events for select using((select auth.uid())=user_id);
drop policy if exists "Users insert own activity" on public.activity_events;
create policy "Users insert own activity" on public.activity_events for insert with check((select auth.uid())=user_id);

grant select,insert,update,delete on public.applications,public.contacts,public.application_contacts,public.referral_requests,public.follow_ups,public.outreach_templates to authenticated;
grant select,insert on public.activity_events to authenticated;
grant select,update on public.profiles to authenticated;
