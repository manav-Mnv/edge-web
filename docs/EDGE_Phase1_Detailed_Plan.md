# EDGE — Phase 1 Detailed Build Plan
**Golden Path: Auth → Onboarding → Event → Registration → Attendance (Mode A) → Certificate**

Starting point: Next.js App Router workspace at `M:\sem3\PUMA\Edge\` configured with Supabase (Postgres, Auth, RLS) as primary database and Firebase (FCM only for push notifications).

---

## STAGE 0 — Repo & Local Environment Setup

Completed baseline setup:

### 0.1 Prerequisites
- Node.js (LTS version) & npm
- Git repository configured on `main` branch
- Remote `origin` linked to `https://github.com/manav-Mnv/edge-web.git`

### 0.2 Git Configuration
- Comprehensive `.gitignore` protecting secrets (`.env*.local`, service account keys, certificates) while tracking `.env.example`.

### 0.3 Scaffold Next.js App
- Next.js 16 (App Router, Turbopack, React 19, TypeScript, ESLint v9, Tailwind CSS v4) at project root (`src/app`, `@/*` alias).

### 0.4 Backend Services Setup
- **Supabase Project** (Postgres, Auth, RLS) on free tier.
- **Firebase Project** configured with **Cloud Messaging (FCM)** enabled only (no Firestore, no Firebase Auth).

### 0.5 Environment Variables
- `.env.example`: Public template with `ALLOWED_EMAIL_DOMAIN`, Supabase keys, Firebase client config, Firebase Admin private key, and QStash placeholders.
- `.env.local`: Local instance for development (gitignored).

### 0.6 SDK Modules Architecture
- `src/lib/utils.ts`: Tailwind CSS class merge helper `cn()`.
- `src/lib/constants.ts`: Allowed domain and role constants.
- `src/lib/supabase/client.ts`: Browser Supabase client (`createBrowserClient`).
- `src/lib/supabase/server.ts`: Server-side SSR Supabase client (`createServerClient` with cookies).
- `src/lib/firebase/client.ts`: Client-side Firebase app & messaging.
- `src/lib/firebase/admin.ts`: Server-side Firebase Admin SDK (FCM push only).

---

## STAGE 1 — Domain Verification & Auth Callback (the gatekeeper)

**Goal:** No user is treated as "real" until their email is confirmed to end in the Parul domain (`paruluniversity.ac.in`), verified server-side.

**Logic:**
- **OAuth Callback Route Handler** (`src/app/auth/callback/route.ts`):
  - Handles the redirect from Supabase Google OAuth with the auth `code`.
  - Exchanges code for session server-side (`supabase.auth.exchangeCodeForSession(code)`).
  - Extracts the authenticated user's email.
  - Checks the email domain against `ALLOWED_EMAIL_DOMAIN` (`paruluniversity.ac.in`).
  - **Pass**: Check `users` table. If profile is new/incomplete, redirect to `/onboarding`; if complete, redirect to `/dashboard`.
  - **Domain check failure / timeout (Fail Open per SRS Section 7.6)**: Flag `needs_manual_review: true` in `users` table and allow entry without blocking legitimate students during technical hiccups.
  - **Explicit Non-Parul email rejection**: Sign out and redirect to `/login?error=invalid_domain`.
- **Next.js Middleware** (`src/middleware.ts`):
  - Refreshes Supabase session tokens on incoming requests.
  - Protects authenticated routes (`/dashboard`, `/events/create`, `/tickets`, `/onboarding`).

---

## STAGE 2 — Auth Flow (Path A: verified Parul email only)

**Setup:**
- In Google Cloud Console / Supabase Dashboard: Configure Google OAuth credentials (Client ID, Secret, and Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`).
- In Supabase Auth Settings: Enable Google Provider.

**Logic to build:**
- Sign-in page (`/login`): Clean, branded interface with "Continue with Google" button.
- Initiates Supabase OAuth: `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: ... } })`.
- On successful OAuth return, callback route handler runs Stage 1 domain check and checks `users` table:
  - Record missing or onboarding incomplete → redirect to `/onboarding` (Stage 3).
  - Record complete → redirect to `/dashboard`.
- Role assignment: New user record gets `role: 'student'` by default. Promoting a user to AD or Faculty for testing is done via **direct edit in the Supabase Table Editor** for Phase 1.

---

## STAGE 3 — Onboarding (Screens 1, 2, & 4)

**Logic to build:**
- **Screen 1 (The Basics)**: Name (prefilled from Google, editable), PU Email (read-only identity anchor), Enrollment / UG Number (manual input).
- **Screen 2 (Academic & Campus Profile)**: Institute (dropdown), Course (dropdown), Year & Semester (dropdown), Mobile Number (required), Personal Email (required), Residence (Hosteller/Day Scholar pill toggle).
- **Screen 4 (Final Touches — optional/skippable)**: Profile photo preview, Notification toggle.
- On submit: Write to Supabase `users` table:
  - `id` (references auth.users.id)
  - `email`, `full_name`, `enrollment_no`, `institute`, `course`, `year_sem`, `mobile`, `personal_email`, `residence`
  - `role`: `'student'`
  - `verification_status`: `'verified'`
  - `needs_manual_review`: `false`
  - `created_at`: `now()`
- Redirect directly to `/dashboard`.

---

## STAGE 4 — Event Creation (AD/Faculty auto-verified path only)

**Logic to build:**
- Create Event page (`/events/create`), gated to users with `role IN ('ad', 'faculty')`.
- Form fields: Title, Description, Date & Time, Venue, Capacity, Tag (single select from fixed list).
- On submit: Insert row into Supabase `events` table:
  - `id`, `title`, `description`, `event_date`, `venue`, `capacity`, `tag`
  - `creator_id` (auth.uid()), `creator_role`
  - `status`: `'verified'` (auto-verified on creation for AD/Faculty)
  - `created_at`: `now()`

**Supabase Row-Level Security (RLS) Policies (Phase 1 Baseline):**
- `events`: `SELECT` allowed for all authenticated users; `INSERT` allowed only where requesting user's `role IN ('ad', 'faculty')`.
- `users`: `SELECT` and `UPDATE` allowed for own record (`auth.uid() = id`).

---

## STAGE 5 — Event Discovery & Registration (Open access only)

**Logic to build:**
- **Events List Page** (`/events` or `/dashboard`): Query published `events` table, render event cards (Title, Date, Venue, Spots remaining).
- **Event Detail Page** (`/events/[id]`): Full event description, organizer details, and Register button.
- **Registration Action**:
  - Insert row into Supabase `registrations` table:
    - `id`, `event_id`, `user_id`, `status: 'registered'`, `created_at: now()`
  - Enforce unique constraint on `(event_id, user_id)` to prevent duplicate registrations.

---

## STAGE 6 — Attendance (Mode A only — organizer-scanned)

**Logic to build:**
- **My Tickets Screen** (`/tickets` or `/events/[id]/ticket`): Student-facing screen rendering a QR code containing encoded `userId + eventId`.
- **Organizer Scanner Screen** (`/events/[id]/scan`): AD/Faculty view using device camera (via HTML5 QR scanner) to scan student QR codes.
- **Scan Validation & Write**:
  - Decode `userId + eventId`.
  - Check `attendance` table for existing `(event_id, user_id)` pair.
  - If present: Show "Already marked present".
  - If not present: Insert row into `attendance` table (`event_id`, `user_id`, `registration_id`, `check_in_mode: 'mode_a'`, `timestamp: now()`).

---

## STAGE 7 — Certificate Issuance (manual trigger, standard template)

**Logic to build:**
- On event admin view: "Mark Complete" button visible only to event creator or AD.
- On click:
  - Update `events` row: `completed_at = now()`, `completed_by = auth.uid()`.
  - Query all `attendance` records for the event.
  - For each attendee, generate standard certificate record in `certificates` table (`attendance_id`, `student_name`, `event_title`, `event_date`, `issued_at: now()`).
  - Student can view/download certificate from their dashboard or event page.

---

## Explicitly OUT of Phase 1
Club Lead approval workflow · Temporary UG-number signup path (Path B) · Invite-only events · Waitlist auto-promotion · Mode B self-scan + QStash queue · Google Sheets sync · Push notifications · Recurring events · Post-event feedback forms · Multi-tag selection · Onboarding Screen 3 (Clubs/Interests)

---

## Suggested Build Order Recap
1. Stage 0 — Foundation (repo, Next.js, Supabase & Firebase SDKs, env vars, log setup) ✅
2. Stage 1 — Domain check & Auth callback handler
3. Stage 2 — Google Auth sign-in page & session flow
4. Stage 3 — Onboarding (Screens 1, 2, 4) & `users` profile insertion
5. Stage 4 — Event creation + basic RLS policies
6. Stage 5 — Discovery & registration (`events`, `registrations`)
7. Stage 6 — Attendance Mode A (QR ticket generation & camera scan)
8. Stage 7 — Event completion & certificate generation
