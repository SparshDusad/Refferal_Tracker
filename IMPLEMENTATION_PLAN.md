# ReferralFlow — implementation plan

This repository is being developed directly on `main` at the owner's request. Work is shipped in small, verifiable milestones.

## Milestone 1 — App foundation and usable dashboard
- Next.js App Router, TypeScript and Tailwind CSS
- Responsive premium dashboard with coordinated light/dark modes
- Application create/edit/delete, stage management, search and filtering
- List and Kanban views
- Contact directory, follow-up queue, editable outreach templates
- CSV import/export with basic validation and duplicate detection
- Supabase client setup and documented environment variables

## Milestone 2 — Secure cloud persistence
- Supabase Auth passwordless sign-in
- PostgreSQL schema for profiles, applications, contacts, referral requests, follow-ups, templates, and activity
- Row Level Security on every user-owned table
- Load and mutate only records owned by the authenticated user
- Replace demo data with real data when a project is configured

## Milestone 3 — Quality and production readiness
- Add unit and end-to-end tests for core flows
- Validate database constraints, URL inputs, and CSV edge cases
- Add accessible form labels, keyboard/focus behavior, and responsive checks
- Add CI for type checking, linting, tests, and production builds
- Verify Vercel deployment and environment configuration

## Milestone 4 — Optional enhancements
- Calendar integration, browser-assisted capture, and reminders only when useful
- No paid API is required for the core tracking workflow

## Local development
1. Install Node.js LTS.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. For cloud authentication, create a Supabase project, fill in the public project URL and anon/publishable key, then run `supabase/schema.sql` in the Supabase SQL Editor.
5. Run `npm run dev`.

The initial interface includes illustrative sample records. Until authentication, schema migration, and the data access layer are complete, these are demo records and must not be treated as durable cloud-backed user data. Never put a Supabase service-role key in a browser environment variable.
