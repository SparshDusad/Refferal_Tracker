# ReferralFlow

A lightweight career CRM for job applications, referral contacts, outreach templates, and follow-ups. The core workflow does not require paid APIs or automated messaging.

## Current milestone

- Next.js App Router, TypeScript, Tailwind CSS, and Supabase clients
- Dashboard, application pipeline, contact directory, follow-up queue, referral-request pipeline, and editable templates
- Per-user Supabase persistence for applications, contacts, referral requests, and templates; new accounts receive their own default outreach templates
- CSV import/export, light/dark mode, and mobile-responsive layouts
- ReferralFlow Copilot: workspace progress summary, prioritized next-step recommendations, and a question-and-answer panel
- Authenticated server-side Gemini integration is optional; built-in rules-based guidance works without an external AI API
- Application, contact, and referral changes appear in the private activity timeline
- PostgreSQL schema with row-level security (RLS) for per-user data isolation

See IMPLEMENTATION_PLAN.md for the milestone roadmap. The sample records are illustrative and are not actual user data.

## Run locally

Requirements: Node.js 20.9 or newer and npm.

1. Run `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY from your Supabase project. Older projects may use NEXT_PUBLIC_SUPABASE_ANON_KEY. Never expose a service-role key to browser code.
4. Optional: set GEMINI_API_KEY and GEMINI_MODEL as server-only environment variables to enable generative copilot answers. Keep GEMINI_API_KEY out of NEXT_PUBLIC_ variables. Without it, the built-in rules-based copilot remains available.
5. When Gemini is configured, clicking **Ask agent** sends the question and a compact summary of the workspace to Google for that response. No workspace data is sent to Gemini automatically.
6. Run `supabase/schema.sql` in the Supabase SQL Editor.
7. Add `http://localhost:3000` and your production URL to Supabase Auth allowed redirect URLs.
8. Run `npm run dev` and open `http://localhost:3000`.

Without Supabase credentials, the UI opens in preview mode using sample records. Preview changes are only in memory and are not saved across refreshes. With keys configured, users sign in using a one-time email link and records are persisted in Postgres under RLS.

## Deploy on Vercel

Import the GitHub repository, configure the two public Supabase environment variables, apply the schema, add the Vercel domain to Supabase Auth redirect URLs, and deploy. To enable generative copilot answers, add `GEMINI_API_KEY` and optionally `GEMINI_MODEL` in Vercel's server-side environment settings, then redeploy. Verify sign-in, CRUD flows, and the copilot using an authenticated account.

## CSV format

Required headers: company, role. Optional headers: stage, job_url, location, priority, applied_at, next_action, next_action_date, notes. Stage values: saved, referral_requested, applied, interview, offer, rejected. CSV import is limited to 2 MB and skips incomplete or duplicate company/role rows.

## Security notes

Every user-owned table has an RLS policy. Linked records also use composite foreign keys to prevent a user from linking rows owned by another account. The browser app never uses the Supabase service-role key. Deletes require confirmation, and outreach messages are copied manually rather than sent automatically.

## Checks

Run npm run typecheck, npm run lint, npm test, and npm run build after installing dependencies. A successful GitHub commit does not replace these checks.
