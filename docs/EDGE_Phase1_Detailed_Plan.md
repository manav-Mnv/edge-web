# EDGE — Phase 1 Detailed Build Plan
**Golden Path: Auth → Onboarding → Event → Registration → Attendance (Mode A) → Certificate**

Starting point: empty folder `M:\sem3\PUMA\Edge\` with only a `docs\` subfolder containing `EDGE_PRD_v2.0.md` and `EDGE_SRS_v2.0.md`. No repo, no Next.js app, no Firebase project connected yet. This plan assumes exactly that starting point.

---

## STAGE 0 — Repo & Local Environment Setup (all manual)

Do these in order, in the VS Code terminal (PowerShell), from `M:\sem3\PUMA\Edge\`.

### 0.1 Install prerequisites (check first, install if missing)
- Node.js (LTS version) — check with `node -v` in terminal. If not installed, get it from nodejs.org.
- Git — check with `git -v`. If not installed, get it from git-scm.com.
- GitHub CLI or just a GitHub account logged in via browser — either works for pushing the repo.
- Firebase CLI — installed later via npm, not needed system-wide yet.

### 0.2 Initialize Git
- Run `git init` inside `M:\sem3\PUMA\Edge\` — this makes the whole Edge folder (docs included) one repo.
- Create a `.gitignore` immediately (Next.js will add to this later, but start one now so you never accidentally commit `.env` files or `node_modules`).
- Create the GitHub repo `edge-web` under your account (private, as already decided) — do this on github.com directly, don't initialize it with a README (avoids merge conflicts with your local init).
- Connect local repo to GitHub remote and do an initial commit with just the `docs\` folder.

### 0.3 Scaffold Next.js app
- From inside `M:\sem3\PUMA\Edge\`, run the Next.js create command targeting a subfolder (e.g. `app\` or directly at root — decide now: recommend scaffolding at root of the repo so `docs\` sits alongside `src\`, not nested inside the Next app).
- When prompted, choose: TypeScript = Yes, ESLint = Yes, Tailwind CSS = Yes, App Router = Yes, import alias = default (`@/*`) is fine.
- This generates `package.json`, `next.config`, `app\` directory, `public\`, and a starter `.gitignore` (merge with your earlier one if needed — make sure `.env*.local` is in there).
- Run the dev server once to confirm it works before touching anything else — you should see the default Next.js page on localhost.
- Commit this scaffold as its own commit ("Next.js app init") before adding any custom code — gives you a clean rollback point.

### 0.4 Firebase project setup (Firebase Console, browser — manual)
- Go to Firebase Console, create project (or confirm existing one) — name it something like `edge-university`.
- Confirm billing plan is **Spark** (free) — do not upgrade to Blaze, that was the old v1.0 SRS assumption and is no longer the plan.
- Enable **Firestore Database** — choose production mode, pick region `asia-south1` (closest to India, lowest latency for your users).
- Enable **Authentication** → Sign-in method → enable **Google** provider.
- Enable **Cloud Messaging** (FCM) — just toggle it on, you won't wire push notifications until later phases.
- Go to Project Settings → General → "Your apps" → add a **Web app** — this generates the public config object (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId). Copy all six values somewhere safe temporarily.
- Go to Project Settings → Service Accounts → Generate new private key — this downloads a JSON file. **This file is secret.** Do not put it in the repo folder at all, keep it outside the project directory or immediately note its contents into your env setup and delete the file.

### 0.5 Environment variables (local)
- In the Next.js app root, create `.env.local` (this file must already be gitignored — verify).
- Add the six Firebase web config values, each prefixed `NEXT_PUBLIC_` since the browser needs to read them (e.g. `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, etc.)
- Add the Admin SDK service account values WITHOUT the `NEXT_PUBLIC_` prefix (these stay server-only): the client_email, private_key, and project_id from the downloaded JSON. Note: the private_key has literal `\n` characters in it — when pasting into `.env.local` keep it as a single-line string with `\n` escapes intact, this trips people up.
- Add one more var: `ALLOWED_EMAIL_DOMAIN=paruluniversity.ac.in` — so the domain check isn't hardcoded anywhere in your code.

### 0.6 Vercel setup (browser + terminal)
- Push your current repo state to GitHub (`git push`).
- Go to vercel.com, "Add New Project," import the `edge-web` GitHub repo.
- Vercel auto-detects Next.js — accept defaults.
- Before first deploy, go to Project Settings → Environment Variables in Vercel and paste in the exact same variables from `.env.local` — set them for Production, Preview, and Development environments all three.
- Trigger the deploy. Confirm `edgeweb.vercel.app` (or whatever URL Vercel assigns) loads the default Next.js page.
- From now on, every `git push` to main auto-deploys — this is your whole deployment pipeline for Phase 1, no manual deploy steps needed after this.

### 0.7 Install Firebase SDK packages (terminal, inside the Next.js app)
- Install the client Firebase SDK package (for browser-side auth/Firestore calls).
- Install the Firebase Admin SDK package (for server-side verification in your API routes).
- Create a small internal convention now (not code, just a decision): one file initializes the client SDK using the `NEXT_PUBLIC_` vars, and a separate file initializes the Admin SDK using the server-only vars — these must never be imported into each other's context (client file never touches Admin credentials, Admin file never runs in a browser bundle).

**End of Stage 0 checkpoint:** empty repo → live Next.js app on Vercel, Firebase project provisioned, all secrets in place, nothing custom built yet. This is your true foundation line.

---

## STAGE 1 — Domain Verification (the gatekeeper)

**Goal:** No user is treated as "real" until their email is confirmed to end in the Parul domain, verified server-side (never trust the client alone).

**Logic:**
- This lives as a Route Handler (App Router's server-side API endpoint), not a page.
- Client signs in with Google via Firebase Auth in the browser → gets back a Firebase ID token.
- Client sends that ID token to your route handler.
- The route handler uses the Admin SDK to **verify the token server-side** — this confirms the token is genuine and not spoofed, and extracts the real email from it.
- Check the extracted email's domain against `ALLOWED_EMAIL_DOMAIN`.
- Pass → respond success, client proceeds.
- Fail → respond rejection, client immediately signs the user out of Firebase Auth client-side and shows a specific message ("Please use your Parul University email to sign in").
- Never do this check purely in the browser — a client-side-only check can be bypassed by anyone with dev tools open.

**Manual step:** none beyond what Stage 0 already set up — this is pure logic to build, no external service configuration needed.

---

## STAGE 2 — Auth Flow (Path A: verified Parul email only)

**Manual (Google Cloud Console, linked to your Firebase project):**
- Configure the OAuth consent screen (support email, app name) if not already prompted through Firebase's own flow.
- In Firebase Auth settings → Authorized domains, add `edgeweb.vercel.app` and `localhost` (localhost is usually there by default).

**Logic to build:**
- Sign-in page: one "Continue with Google" button. No email/password option in Phase 1.
- On successful Google sign-in client-side → immediately call Stage 1's verify route.
- On pass, check Firestore for an existing `users/{uid}` document:
  - Doesn't exist → redirect to onboarding (Stage 3).
  - Exists → redirect to dashboard/home.
- Let Firebase Auth's own client-side persistence handle "staying logged in" — don't build custom cookies/sessions for Phase 1, that's unnecessary complexity right now.
- New user Firestore doc gets `role: student` by default. Promoting someone to AD/Faculty/Club Lead is a **manual edit directly in the Firestore Console** for now — no admin UI for role assignment yet. This is intentional; building a role-management UI is not golden-path-critical.

---

## STAGE 3 — Onboarding (Screens 1 & 2 only)

**Manual:**
- Write a plain placeholder list of ~10–15 real Parul Institutes and Courses (pull from the university website) — don't wait for an "official complete list," a working placeholder unblocks the build.

**Logic to build:**
- Screen 1: Name (auto-filled from Google profile, editable), PU Mail (auto-filled, read-only/locked), Enrollment/UG Number (manual text entry).
- Screen 2: Institute (dropdown from your placeholder list), Course (dropdown), Year & Semester (dropdown), Mobile Number (required text input), Personal Email (required text input).
- On submit: write one Firestore document to `users/{uid}` containing all collected fields plus `role: "student"`, `verified: true`, `createdAt: <timestamp>`.
- Skip Screens 3 (interests/club suggestions) and 4 (photo/notification toggle) entirely — go straight to the dashboard after Screen 2 submits.

---

## STAGE 4 — Event Creation (AD/Faculty auto-verified path only)

**Manual:**
- In Firestore Console, manually edit your own test user's document to set `role: "AD"` (or `"faculty"`) so you can test the creation flow.

**Logic to build:**
- "Create Event" page, gated so only users with role AD or faculty see/can access it (check client-side for UI, but the real enforcement is Firestore Security Rules below — never rely on hiding a button as your only security).
- Form fields: Title, Description, Date & Time, Venue, Capacity, one Tag (single select from a small fixed list — skip multi-tag selection for now).
- On submit: write to an `events` collection with `status: "verified"` set automatically (no approval object/workflow needed yet, since Club Lead's approval loop is out of scope for Phase 1).
- Store `createdBy: <uid>` and `createdByRole` on the event document — needed later for scoping/visibility rules.

**Firestore Security Rules (write these now, not later — this is the actual security layer):**
- Only authenticated users whose Firestore user doc has role `AD` or `faculty` can create documents in `events`.
- Any authenticated, verified user can read from `events`.
- Users can only write to their own `users/{uid}` document, never someone else's.
- Draft these rules in the Firebase Console's Rules editor, test them there before relying on them in the app.

---

## STAGE 5 — Event Discovery & Registration (Open access only)

**Logic to build:**
- Events list page: query the `events` collection, render as cards (Title, Date, Venue, spots remaining vs. capacity).
- Event detail page: full event info plus a Register button.
- Registration logic on click:
  - Count current registrations for that event.
  - Under capacity → create a registration record with `eventId`, `userId`, `status: "registered"`, `timestamp`.
  - At/over capacity → same record but `status: "waitlisted"`.
- Skip entirely for Phase 1: Invite-Only events, the overlapping-event soft warning, waitlist auto-promotion notifications. Every Phase 1 event is Open access, no invite logic.

---

## STAGE 6 — Attendance (Mode A only — organizer-scanned)

**Manual (decide on paper before building either side):**
- Lock your QR payload format now: what data actually gets encoded (recommend `userId + eventId`, structured so it's parseable, e.g. a simple delimited string or JSON string). This decision affects both ticket generation and scanning, so fix it before writing either piece.

**Logic to build:**
- "My Tickets" screen (student-facing): generates a QR code client-side from the student's own registration data, using a standard QR-generation library (not a custom implementation).
- Organizer scanner screen (AD/Faculty view): uses the device camera to scan a QR, decodes it back into `userId + eventId`.
- On a successful scan:
  - Check if an attendance record already exists for that exact `userId + eventId` pair.
  - Doesn't exist → create one: `status: "present"`, `timestamp`.
  - Already exists → show "already marked present" — do not create a duplicate record.
- No queue/jitter/QStash system needed here — that's explicitly Mode B / Phase 2 territory, since Mode A is a single scanner doing sequential scans at pilot scale, not 1000 concurrent writes.

---

## STAGE 7 — Certificate Issuance (manual trigger, one static template)

**Manual:**
- Design a single static certificate layout (logo placeholder, name field position, event name, date) — a design/asset task, hand off to your UI/UX teammate if useful. Doesn't need to be fancy for Phase 1, just functional and on-brand.

**Logic to build:**
- On an event's admin view, a "Mark Complete" button, visible only to that event's creator or an AD (role + ownership check).
- On click: query all attendance records for that event where `status: "present"`, loop through them, generate one certificate per student with their name filled into the template.
- For Phase 1, a direct-download response for each generated certificate is enough to prove the pipeline — don't build Google Drive auto-upload yet if it adds friction, that can follow once the core loop is proven.
- Skip for Phase 1: the verification QR code embedded on the certificate itself, automatic re-issue on name correction, and per-event custom templates. All correctly Phase 2+.

---

## Explicitly OUT of Phase 1 (do not let these creep back in)
Club Lead approval workflow · Temporary UG-number signup path · Invite-only events · Waitlist auto-promotion + notification · Mode B self-scan + QStash queue · Google Sheets sync · Push notifications · Recurring events · Post-event feedback forms · Multi-tag selection · Onboarding Screens 3 & 4

Every one of these is real, documented scope — just correctly sequenced into Phase 2 or Phase 3. Resist pulling them forward; the entire point of Phase 1 is proving the thin end-to-end loop works before adding breadth.

---

## Suggested Build Order Recap (fastest path to a working demo)
1. Stage 0 — foundation (repo, Next.js, Firebase, Vercel, env vars)
2. Stage 1 + 2 together — domain check + Google auth (they're tightly coupled)
3. Stage 3 — onboarding
4. Stage 4 — event creation + security rules
5. Stage 5 — discovery + registration
6. Stage 6 — attendance Mode A
7. Stage 7 — certificate generation

Each stage should end with something you can actually click through in the browser before moving to the next — don't build two stages in parallel without testing the first.
