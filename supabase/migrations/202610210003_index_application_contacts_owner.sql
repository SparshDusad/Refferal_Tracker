-- Cover the owner foreign key for efficient deletes and user-scoped filtering.
create index if not exists application_contacts_user_id_idx on public.application_contacts(user_id);
