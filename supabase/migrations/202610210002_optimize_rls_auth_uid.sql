-- Evaluate auth.uid() once per statement rather than once per row.
drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles for select using ((select auth.uid()) = id);
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "Users manage own applications" on public.applications;
create policy "Users manage own applications" on public.applications for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage own contacts" on public.contacts;
create policy "Users manage own contacts" on public.contacts for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage own application contacts" on public.application_contacts;
create policy "Users manage own application contacts" on public.application_contacts for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage own referral requests" on public.referral_requests;
create policy "Users manage own referral requests" on public.referral_requests for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage own follow ups" on public.follow_ups;
create policy "Users manage own follow ups" on public.follow_ups for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage own templates" on public.outreach_templates;
create policy "Users manage own templates" on public.outreach_templates for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users read own activity" on public.activity_events;
create policy "Users read own activity" on public.activity_events for select using ((select auth.uid()) = user_id);
drop policy if exists "Users insert own activity" on public.activity_events;
create policy "Users insert own activity" on public.activity_events for insert with check ((select auth.uid()) = user_id);
