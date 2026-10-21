-- Index foreign-key paths used by owner-scoped joins and follow-up queries.
create index if not exists application_contacts_application_user_idx
  on public.application_contacts(application_id, user_id);
create index if not exists application_contacts_contact_user_idx
  on public.application_contacts(contact_id, user_id);
create index if not exists referral_requests_application_user_idx
  on public.referral_requests(application_id, user_id);
create index if not exists referral_requests_contact_user_idx
  on public.referral_requests(contact_id, user_id);
create index if not exists follow_ups_application_user_idx
  on public.follow_ups(application_id, user_id) where application_id is not null;
create index if not exists follow_ups_contact_user_idx
  on public.follow_ups(contact_id, user_id) where contact_id is not null;
create index if not exists follow_ups_referral_user_idx
  on public.follow_ups(referral_request_id, user_id) where referral_request_id is not null;

-- A single referral record per person/opportunity pair prevents accidental duplicates.
create unique index if not exists referral_requests_unique_person_opportunity
  on public.referral_requests(user_id, application_id, contact_id);
