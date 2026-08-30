# EDGE
*Every Node, Connected.*

**Software Requirements Specification**
Parul University — Campus Engagement Platform

**Version 2.0 — Baseline**

---

## Document Control

| Field | Value |
|---|---|
| Document title | EDGE Software Requirements Specification |
| Version | 2.0 (Baseline) |
| Status | Approved for Phase 0/1 build — living document, updated as decisions are made |
| Prepared by | Mnv (Product/Idea Lead) + Claude |
| Applies to | EDGE web platform (Phase 1–2), EDGE mobile platform (Phase 3) |
| Companion document | EDGE Product Requirements Document (PRD) v2.0 |
| Change control | Any change to a **LOCKED** item (Section 4.1) requires explicit reconsideration, not a silent edit. All other items may be updated as the build progresses; update the Revision History table below with each change. |

## Revision History

| Version | Description |
|---|---|
| 1.0 | Original full spec — Firebase backend, 5-tier roles, dual-mode attendance |
| 1.1–1.3 | Split from PRD, corrected to actual free-tier stack, Supabase+Firebase(FCM) locked |
| 1.4–1.6 | Phase tagging introduced, but a rewrite pass compressed and lost several full sections (Onboarding, Verification Ticks, Notifications, Security & Moderation, Clubs, detailed role table) |
| 1.7 | Full content rebuild — restored lost sections, but the rebuild itself introduced a new gap (Notifications referenced but not actually written) |
| 1.8 | Notifications written as a real section; full renumbering; all cross-references mechanically verified |
| 1.9 | Fixed AD's role-phase tag (was flatly Phase 2, contradicting its own Phase 1 event-creation capability); restored Team/Timeline to PRD; explicit phase tags added to two previously-untagged registration behaviors; deduplicated Events' out-of-scope list against the master list |
| **2.0** | **Baseline release.** Fixed the same class of issue in Faculty's role tag (Faculty Advisor capability depends on Phase 2's Clubs, now noted). Added this Document Control block, a Glossary (Section 3), and a Phase 1 Requirement Traceability table (Appendix A) for build tracking. This version is the one to build Phase 1 against. |

---

# 1. Introduction

## 1.1 Purpose
EDGE is a cross-platform (App + Website) campus engagement system for Parul University. It centralizes event discovery, registration, attendance tracking, club management, certificate issuance, and administrative oversight across the university's departments and student clubs. This SRS defines the technical requirements needed to build it, sequenced by build phase.

## 1.2 Scope
EDGE covers the full lifecycle of a campus event or club interaction: discovery → registration → attendance → certification, plus the administrative hierarchy needed to create, approve, and oversee that activity at club, department, and university-wide levels.

## 1.3 Intended Audience
- **Software Architects / Developers** — Sections 4–13 in full
- **QA / Test Engineers** — Section 5 (phase scope/exit conditions) and Section 14 (Edge Cases), plus Appendix A for Phase 1 acceptance tracking
- **UI/UX Designers** — Sections 6–13 (role, onboarding, event, attendance, club, certificate, and notification requirements)

## 1.4 Build Order Principle
Nothing beyond Phase 1 (the golden path) gets built until it works end-to-end for a real user, on web. Every requirement in this document is tagged **Phase 1 / Phase 2 / Phase 3**. Each phase has an explicit exit condition (Section 5). A phase is not complete until its exit condition is literally, verifiably true — not "mostly working."

---

# 2. Companion Document
This SRS defines *how* EDGE is built. Product framing — the problem it solves, user stories, success criteria, and rollout narrative — lives in the companion **PRD v2.0**. Where the two overlap (roles, feature scope), this SRS is the technical source of truth and the PRD is the product-framing source of truth; neither should be treated as a lesser copy of the other.

---

# 3. Glossary

| Term | Meaning |
|---|---|
| **AD** | Department Admin — approves club/event activity within one department |
| **Golden path** | The single, simplest end-to-end flow (register → attend → get certificate) that Phase 1 exists to prove works |
| **RLS** | Row-Level Security — Postgres/Supabase mechanism restricting which rows a query can see/modify, based on the requesting user |
| **Mode A / Mode B** | The two attendance check-in methods — Mode A is organizer-scans-student; Mode B is student-self-scans-shared-QR |
| **Verified / Unverified** | A student's identity status — Verified means their Parul email is confirmed; Unverified means they signed up with a temporary UG number and haven't linked a Parul email yet |
| **Hub** | An optional AD-created grouping that sits above Clubs; not a role, just an organizational label |
| **Fail open / fail closed** | Security-boundary behavior when a check errors out — "fail open" lets the action through anyway (used for EDGE's domain verification); "fail closed" blocks it |
| **QStash** | Upstash's managed async message queue — EDGE's replacement for Firebase Cloud Tasks |
| **FCM** | Firebase Cloud Messaging — used in EDGE purely for push notification delivery, independent of any other Firebase service |

---

# 4. Technical Architecture

## 4.1 Backend — LOCKED (Phase 0, do not revisit without cause)

| Layer | Service | Role |
|---|---|---|
| Primary database | **Supabase (Postgres, free tier)** | User, Club, Event, Registration, Attendance, Certificate |
| Auth | **Supabase Auth** | Google Sign-In + Parul domain check |
| Row-level permissions | **Supabase RLS policies** | Enforces role/visibility matrix (Section 9.1) |
| Push notifications | **Firebase — FCM only** | Standalone; no Firestore, no Firebase Auth used |
| Compute | **Vercel serverless functions** | `edgeweb.vercel.app`, repo `github.com/manav-Mnv/edge-web` (private) |
| Async queue | **Upstash QStash (EU region)** | Load-bearing from Phase 2 onward |
| Scheduled jobs | **GitHub Actions** | Phase 3 |
| Data export / file storage | **Google Sheets API + Google Drive** | Service account `edge-sheets-sync`, confirmed working |

**Rationale:** Firestore's 50k read / 20k write daily cap is a hard wall at the 30k-user Phase 3 target. Postgres + RLS also maps more naturally onto the 5-tier role/visibility matrix than Firestore security rules would. FCM is retained specifically because it's free and uncapped regardless of which database sits behind it — there is no reason to lose it just because Firestore was dropped.

**Backup risk (documented, not yet resolved):** Supabase's free tier has no automated backups. Mitigate manually: weekly Postgres export during Phase 1–2, before any schema migration or bulk data operation. Automated backup job is a Phase 3 deliverable.

## 4.2 FCM Integration Mechanics
1. A Firebase project exists with **Cloud Messaging enabled only** — Firestore and Firebase Auth are never touched
2. Client obtains an FCM device token via the standard SDK flow
3. Token is stored in Supabase's `users` table (`fcm_token` column)
4. Vercel functions / QStash jobs call the Firebase Admin SDK's `send()` method directly to deliver push — see Section 13 for the actual notification requirements this powers

## 4.3 Client Platforms
- **Web (Phase 1 onward):** Next.js on Vercel — all Phase 1–2 development happens here
- **Mobile (Phase 3 only):** React Native — build starts only after the web pilot validates core logic
- Platforms required overall: Android, iOS/iPadOS, Web. macOS support (carried over from prior AATCE Connect groundwork) is optional and undecided.

## 4.4 Data Model (Phase 1 baseline, extended per phase)

| Table | Key fields (Phase 1 baseline) | Extended in |
|---|---|---|
| `users` | role, email, verification_status, department, fcm_token, needs_manual_review | Phase 3: audit fields |
| `clubs` | — | Phase 2: name, status, faculty_advisor_id |
| `events` | creator_id, creator_role, status, verification_state, completed_at, completed_by | Phase 3: access_type, capacity, tags[] |
| `registrations` | user_id, event_id, status | Phase 3: waitlist_position |
| `attendance` | registration_id, check_in_mode, timestamp, added_post_completion | Phase 3: offline_synced_at |
| `certificates` | attendance_id, issued_at, template, reissue_reason | Phase 3: verification_qr_url |

## 4.5 Async Queue & Jitter System (Phase 2+)
A shared, generic queue mechanism (Upstash QStash) handles any action that can trigger many simultaneous writes from a single moment. Applies to:
- Attendance self-scan (Mode B) — **highest priority** in the queue
- Google Sheets auto-sync (inherits smoothing automatically)
- Push notification blasts (Section 13)
- Waitlist auto-promotion after mass cancellation
- Certificate generation after an event is marked Complete

**Behavior requirements:**
- Jitter delay is adaptive — scales with concurrent load (target: resolves within 3–6 seconds even at 1000+ concurrent actions)
- Timestamp is captured at the moment of the user's action, not at the moment of processing — preserves accurate ordering regardless of queue delay
- Timeout: if processing exceeds ~15–20 seconds, UI switches to "Still processing — we'll notify you" and releases the user from the loading screen
- Push notification fires on completion, closing the loop for any timed-out action (Section 13)
- A claim is locked the moment it enters the queue — a duplicate attempt (e.g., second scan) immediately shows "already in progress," even before the first write has landed in the database
- Retry logic: if a write genuinely fails, auto-retry a few times; only show the user an error if the action truly did not succeed — never show a false error for a successful action
- Loading screen copy is contextual and on-brand ("Connecting your node...", "Locking in your spot...") rather than generic "Processing..." text

**Open risk, unresolved as of v2.0:** QStash's free-tier message/day limit has not been load-tested against the 800–1000+ concurrent check-in target. This must be tested before Mode B ships in Phase 2 — see Appendix A / Open Items (Section 17).

## 4.6 Row-Level Security — Phase Gating
- **Phase 1 (minimum viable RLS):** basic policies scoping each user to their own record, and event visibility to "published" events only. This is a **Phase 1 blocker**, not optional — running Phase 1 with zero row-level security means any authenticated user can read/write any row via the API.
- **Phase 3 (full RLS enforcement):** the complete field-visibility matrix (Section 9.1) — Club Lead vs. AD vs. Admin vs. Super Admin field-level access.

## 4.7 Non-Functional Requirements

| Category | Target | Applies from |
|---|---|---|
| Minimum OS support | iOS 16+, Android 10+ (proposed default) | Phase 3 (mobile) |
| App load time | < 3 sec on standard campus Wi-Fi | Phase 1 |
| Attendance write scale | 800–1000+ concurrent check-ins within a 1–2 min window | Phase 2 |
| Database read/write ceiling | No daily cap (Postgres) | N/A |
| Backup cadence | Manual weekly export (Phase 1–2), automated job (Phase 3) | Phase 1 |
| Basic RLS (own-record scoping) | Required | Phase 1 |
| Full RLS (field-visibility matrix) | Required | Phase 3 |
| Uptime target | Best-effort; no formal SLA for v1 pilot | Phase 2 |
| Offline support | QR ticket viewable offline (cached locally) for manual fallback verification | Phase 3 |
| Force update | Required — breaking changes block app use until updated | Phase 3 (mobile) |
| Accessibility | Baseline pass — screen reader support, font scaling, colorblind-safe status colors | Phase 1 baseline, refined ongoing |

---

# 5. Build Phases — Scope & Exit Conditions

## Phase 1 — Golden Path
**Scope:** Auth (Verified path only, Section 7.1), Event creation (AD/Faculty only, auto-verified, Section 8.1), Browse + register (Open events only, no capacity/waitlist logic, Section 8.3), Attendance Mode A only (Section 9.1), Event marked Complete (manual trigger, Section 14.1), Certificate auto-issue (standard template, Section 12). Basic RLS in place (Section 4.6).

**Exit condition:** one real person completes the entire loop — sign in, register, get scanned, get a correct certificate — on web, and basic RLS is confirmed active, not just assumed to be working.

## Phase 2 — Pilot-Ready
**Scope:** Club Lead role + full Clubs functionality (Section 11), AD approval flow with SLA escalation (Section 14.2), Attendance Mode B (Section 9.1, QStash live), duplicate check-in prevention, push notifications via FCM (Section 13), Google Sheets sync (async via QStash), temp UG-number signup — Path B (Section 7), post-event feedback (Section 8.7), post-Complete attendance correction (Section 14.1).

**Exit condition:** Swift Coding Club runs one real event through the full loop — registration through certificate — with no critical failure. This is EDGE's stated pilot success criterion (PRD Section 1.5).

## Phase 3 — Scale + Breadth
**Scope:** Waitlists (Section 8.3), invite-only events (Section 8.2), recurring events (Section 8.5), co-hosted/multi-department events (Section 8.4), tags/discovery feed (Section 8.6), Hubs (Section 6A), Admin/Super Admin roles + override + audit trail (Section 6), full RLS enforcement (Section 4.6), DPDP consent flow + data retention jobs (Section 10), manual attendance fallback + offline queueing (Section 9.3), certificate template customization + verification QR (Section 12), Security & Moderation features (Section 10.4), manual-review queue UI for flagged sign-ins (Section 14.3), React Native mobile app.

**Exit condition:** campus-wide rollout live, both platforms functional, full role hierarchy enforced, automated backups running.

---

# 6. Roles & Hierarchy

Hierarchy: **Super Admin → Admin → AD (Department Admin) → Club Lead / Faculty → Student**

## 6.1 Super Admin — *Phase 3*
- Seeded manually into the database at first deployment (one-time bootstrap) — no in-app creation path for the very first account
- Only role that can create Admin accounts
- Full platform-wide visibility — every event, club, department, user, and record, no scoping
- Unrestricted override power over any approval or decision at any level
- Exclusive access to System Settings (approved email domains, certificate defaults, notification rules — Section 13, platform-wide toggles)
- Full, unfiltered platform-wide Audit Log
- Campus-wide announcements with no editing restrictions
- Unrestricted access to all PII platform-wide

## 6.2 Admin — *Phase 3*
- Created only by Super Admin; can create AD accounts (not other Admins, not Super Admin)
- Cross-department visibility — near-identical reach to Super Admin, minus System Settings
- Does not handle routine club/event approvals (that's AD's job) — instead holds override power: can reverse an AD's approval/rejection decision, with the change reflected on the club/event page and logged in the audit trail (original decision, override author, new decision)
- Can push campus-wide announcements, but restricted from editing anything designated "crucial" (exact list TBD — Section 17)
- Audit log visibility: leaning toward full platform-wide log

## 6.3 AD (Department Admin) — *Phase 1 (direct event creation), Phase 2 (approval authority, Clubs, department scoping)*
- **Phase 1 capability:** can create department events directly without needing a club attached, auto-verified immediately — same trust level as Faculty (Section 6.5)
- **Phase 2 capability:** created by Admin; cannot create another AD or an Admin. Core routine approval authority — approves/rejects club creation requests and club events within their department (with remarks; rejections can be resubmitted). Approval SLA: 2 days, flagged overdue if not actioned (escalation logic, Section 14.2). Can assign a Faculty member as lead/organizer for department events.
- Scoped to their own department for dashboard, analytics, announcements, user visibility, and audit log
- Cannot see student phone numbers/personal email by default in the base roster view, but AD (along with Admin) is one of the two roles granted access to that data when needed
- Handover: tied to the AD's PU mail lifecycle — when their account/mail is deactivated, their department is reassigned as part of a defined handover process (**open edge case — Section 15**)

## 6.4 Club Lead (Club Admin) — *Phase 2*
Full detail in Section 11 (Clubs).

## 6.5 Faculty — *Phase 1 (event creation), Phase 2 (Club Advisor capability)*
- **Phase 1 capability:** can create events directly — auto-verified immediately, same trust level as AD, no approval queue. Can be assigned as lead on an AD-created event, with full edit rights on that event.
- **Phase 2 capability:** can serve as Faculty Advisor to a club (assignment made by AD/Admin, not self-selected; not mandatory for a club to remain active) — this depends on Clubs existing, which is Phase 2, so it's noted separately rather than folded into the Phase 1 tag as earlier drafts did.
- Scoped to the events/clubs they supervise for dashboard, analytics, and announcements

## 6.6 Student — *Phase 1 (Verified path, event registration), Phase 2 (temp UG-number path, club membership)*
- Base role — registers for events, receives certificates, views own history and analytics (**Phase 1**); joins/follows clubs (**Phase 2**, depends on Clubs existing)
- Two identity paths: verified (Parul email) or temporary (fresher UG number, unverified until Parul email is linked) — full detail in Section 7

## 6.7 Verification Tick System — *Phase 1 (Event Verified for AD/Faculty), Phase 2 (Club Verified, Event Verified for Club Lead)*

| Tick | Appears on | Trigger | Hover meaning |
|---|---|---|---|
| Club Verified | Club profile | Approved by AD | This club is officially recognized |
| Event Verified | Event card / detail | AD or Faculty: auto-verified on creation. Club Lead: verified after AD approval. | Approved — attendance will be officially granted |

**Technical trigger logic:** `event.creatorRole in ['AD','Faculty']` → auto-set on write. `event.creatorRole == 'ClubLead'` → set only after linked approval record is `approved`. `club.status == 'approved'` set by AD action.

---

# 6A. Hubs — *Phase 3 (Addendum)*
Optional umbrella groupings that sit **above** Clubs.
- Created by **AD only**
- Introduces a "**Director**" **label** — explicitly not a new role, no new permission tier introduced anywhere in Section 6's hierarchy
- Purpose: let related clubs be grouped/organized under one umbrella for discovery/reporting without restructuring the core role hierarchy
- **Not yet merged into the full data model/schema** — still a standalone addendum as of v2.0

---

# 7. Onboarding & Identity

## 7.1 Sign-Up Paths

### Path A — Student with Parul Email — *Phase 1*
- Sign in via Google Sign-In (Parul domain) or email/password
- Domain checked against approved list — instant `Verified` status on match

### Path B — Fresher with Temporary UG Number (e.g., 25UG9xxx) — *Phase 2*
- No Parul email yet — self-signup using UG Number + Name (manual entry, no Google prefill available)
- Duplicate UG number check: if the number already has an account, signup is blocked with "already exists"; a confirmation prompt before final submit reminds the student to double-check their UG number is correct
- Account created as `status: Unverified`
- Verification path: student links their real Parul email once issued, updating their profile — this flips status to `Verified`
- Until verified, they can still fully use the app (register, attend, etc.); on attendance sheets shared with the HOD, unverified status is flagged but does not block their attendance record
- No phone OTP — Firebase Phone Auth requires per-SMS Blaze billing, ruled out regardless of Spark/Supabase status elsewhere

## 7.2 Onboarding Screens (Student) — *Phase 1 basics, Phase 2 full*

**Screen 1 — The Basics** *(Phase 1)*
- Name — auto-filled from Google Sign-In if SSO used; editable
- PU Mail — auto-filled, read-only/locked (identity anchor, cannot be changed); blank for temp UG-number freshers
- Enrollment / UG Number — auto-filled if parseable from email pattern, otherwise manual

**Screen 2 — Academic & Campus Profile** *(Phase 1)*
- Institute — dropdown (hybrid: known institutes pre-filled + "Other → type manually") — **blocked on the full Institute/Course reference list, still TBD (Section 17)**
- Course — dropdown (hybrid, same pattern)
- Year & Semester — dropdown
- Mobile Number — manual entry, required, no OTP verification
- Personal Email — manual entry, required for all students
- Residence — pill toggle: Hosteller / Day Scholar (informational only, no functional logic tied to it for v1)

**Screen 3 — Interests & Clubs** *(Phase 2, since club-following requires Clubs to exist)*
- Interests — tap-select tags (Tech, Design, Music, Sports, Entrepreneurship, Volunteering, etc.) — powers "Recommended for You"
- Suggested Clubs to Follow — auto-suggested from interests, tap to follow instantly

**Screen 4 — Final Touches (optional/skippable)** *(Phase 1)*
- Profile photo — auto-filled from Google account if present, replaceable
- Notification preference toggle — "Notify me about events matching my interests?" (Section 13)

## 7.3 Onboarding Fields (Faculty / AD) — *Phase 1 (Faculty), Phase 2 (AD)*
- Name, PU Mail, Designation (e.g., Assistant Professor)
- Department / Institute
- MIS ID (Employee ID)
- Mobile Number, Personal Email
- Clubs they are Advisor for (assigned by AD/Admin, not self-selected)

## 7.4 Institute / Course Reference List — *Blocks Phase 1 Screen 2*
Full official list of Parul institutes and courses — needed to populate Screen 2 dropdowns. **Status: TBD, placeholder hybrid dropdown planned.**

## 7.5 Error Handling — *Phase 1*
PU mail domain-check failure (typo, personal Gmail used by mistake) shows a clear, specific error message — never a silent block.

## 7.6 Domain-Verification Failure Behavior — *Phase 1*
- **Fails open:** if the domain-verification check fails or times out during sign-in, the user is let through, not blocked
- Account flagged `needs_manual_review: true` on the `users` table at the moment of failure
- Flagged accounts are not restricted from using the app while pending review — consistent with the existing Unverified-student pattern above
- A manual-review queue UI for Admin to clear these flags is a **Phase 3** item — in Phase 1–2, checked directly in the Supabase table by an AD/dev if it comes up
- Deliberate trade-off: prioritizing not locking real students out over strict enforcement at the sign-in boundary — consistent with the product's existing bias toward soft warnings over hard blocks (Section 8.3) and no attendance threshold blocking certificates (Section 9.4)
- **Work item:** `api/verify-domain.js` was written against Firebase Auth's token/session model — needs to be rewritten (not just adapted) against Supabase Auth's session model before Phase 1 sign-in is complete.

---

# 8. Events

## 8.1 Creation & Ownership — *Phase 1 (AD/Faculty), Phase 2 (Club Lead)*

| Creator | Approval needed? | Verification | Phase |
|---|---|---|---|
| AD | No | Auto-verified | Phase 1 |
| Faculty | No | Auto-verified | Phase 1 |
| Club Lead | Yes — AD approval | Verified after approval | Phase 2 |

Rejected submissions retain the AD's remarks and can be revised and resubmitted. Approval SLA: 2 days before flagged overdue (escalation logic, Section 14.2). Admin holds override power over any AD decision.

## 8.2 Access Type — *Phase 3*
- Open — any eligible student can register, subject to capacity/waitlist
- Invite-Only — organizer builds the invite list manually (search/select by name or Student ID) and/or generates a shareable invite link
- Share link requires University (Parul email) sign-in before granting registration access — no anonymous access via link
- Non-invited students attempting to register on an invite-only event are blocked with a clear message

## 8.3 Registration & Capacity — *Phase 1 (Open events, no waitlist), Phase 3 (Waitlist logic, overlap/cancellation handling)*
- **Phase 1:** Open events, standard registration, no capacity ceiling enforced yet
- **Phase 3:** once capacity is hit, further registrants are placed on a Waitlist. Waitlist promotion is automatic and instant when a spot opens — no confirmation window; promoted student is notified (Section 13)
- **Phase 3:** overlapping event registration (two registered events at conflicting times) triggers a soft warning, not a hard block
- **Phase 3:** student-initiated cancellation is visible only on that student's own profile/history, not to other students

*(The last two bullets were untagged in earlier drafts — Phase 3 is the proposed default since neither is required for the Phase 1 golden path; confirm before Phase 1 build if cancellation is wanted sooner.)*

## 8.4 Co-Hosted / Multi-Department Events — *Phase 3*
Two or more clubs can co-host a single event. Events can span multiple departments.

## 8.5 Recurring Events — *Phase 3*
Organizer creates a recurring pattern once (e.g., "Every Tuesday, 5pm, Room 204"); the system auto-generates each instance while tracking registration and attendance separately per instance, so missing one occurrence does not affect others.

## 8.6 Tags & Discovery — *Phase 3*
Organizer selects 1–3 tags at creation from a fixed platform-wide list (Tech, Design, Sports, Music, Career, Volunteering, Cultural, Workshop, Seminar, Competition, etc.). The same tag vocabulary feeds event search/filter and the student's onboarding-interest-based "Recommended for You" feed.

## 8.7 Post-Event Feedback — *Phase 2*
Students can rate/leave feedback after an event concludes. A standard default question set applies to every event; Club Lead can modify/customize the questions per event.

## 8.8 Out of Scope for v1
See Section 16 for the full platform-wide out-of-scope list. The items most directly relevant to Events specifically are paid/ticketed events, venue/room double-booking detection, and non-Parul guest registration.

---

# 9. Attendance

## 9.1 Dual Check-In Modes — Always Both Active

**Mode A — Individual Scan** — *Phase 1*
Organizer/lead scans each student's personal QR ticket (from "My Tickets") one at a time. Best for small events; lead visually confirms identity.

**Mode B — Screen Self Check-in** — *Phase 2*
A single shared QR is displayed on a screen/projector; students self-scan with their own device in parallel. Deep-links into the app if installed, falls back to a web page if not. This is the mode that requires the QStash async queue (Section 4.5).

Both paths write to the same underlying Attendance record — a second attempt (either mode, either device) is met with "already marked present," never a duplicate row.

## 9.2 Post-Scan Account Check (Mode B) — *Phase 2*
- Existing account: recognized instantly, confirmation screen pre-filled from profile, one tap to confirm
- New/unrecognized user: prompted to sign in with Parul email, completes a short onboarding capture, then reaches the same confirmation screen

## 9.3 Manual Fallback — *Phase 3*
- No camera / broken phone: lead manually enters the student's Enrollment Number or searches by name on their own device
- No internet at venue: manual-entry attendance queues locally on the lead's device and auto-syncs once connectivity returns

## 9.4 Verification & Certificate Eligibility — *Phase 1*
No minimum attendance percentage/threshold is enforced for v1 — any successful check-in counts toward certificate eligibility once the event is marked Complete (Section 14.1).

## 9.5 Deferred to v2
Geofencing (GPS proximity check before allowing self-scan), QR rotation (screen QR changing every 30–60 seconds).

---

# 10. Data, Privacy & Moderation

## 10.1 Field Visibility Matrix

| Field | Club Lead | AD / Admin | Super Admin |
|---|---|---|---|
| Name, Enrollment, PU Mail, Dept, Course, Degree, Residence, Year/Sem, Institute | ✅ | ✅ | ✅ |
| Phone Number, Personal Email | ❌ | ✅ | ✅ |

Enforced via Supabase RLS — see Section 4.6 for phase gating (basic in Phase 1, full field-level enforcement in Phase 3).

## 10.2 Data Retention — *Phase 3 (automated), documented from Phase 1*
- Student data is retained as long as their Parul email account remains active
- User-submitted content (resume uploads, profile photos) follows the same rule; upon account deletion, a 20-day grace window precedes permanent deletion
- Enforced via a GitHub Actions scheduled job — not yet written

## 10.3 Compliance (DPDP Act 2023) — *Phase 3*
- Explicit consent checkbox at signup ("I agree to data collection/processing")
- Terms of Service / Privacy Policy — self-drafted for v1 (no legal review budgeted at this stage), accurately reflecting actual data practices; formal legal review recommended only if EDGE scales beyond the university

## 10.4 Security & Moderation — *Phase 3*
- Multi-device login is supported; duplicate check-in is prevented at the Attendance-record level (tied to registration, not device/session), so this introduces no new risk
- Students can self-deactivate their account; deactivation also triggers automatically on PU mail expiry
- Automated flagging for suspicious activity (e.g., mass self-scan attempts) — thresholds not yet defined
- Students can report inappropriate announcements/clubs/events — reviewed by the relevant AD, escalating to Admin
- AD/Admin can suspend an individual Club Lead's or Faculty's admin privileges without deactivating the club itself
- In-app "Report an Issue" feature — routes to Admin only

---

# 11. Clubs — *Phase 2*
- Only a **Club Lead** can initiate a club creation request — routed to AD for approval
- Approval **auto-assigns the requester as Club Admin**
- Students can belong to/follow **multiple clubs simultaneously**, and can leave/unfollow **any time** — this is the only way to exit
- **Club Lead cannot remove members** — no removal action exists for this role. Design should account for a "report to AD" path as the actual recourse (see PRD user stories, Section 2.2)
- Club Lead's member visibility: name, enrollment, PU mail, dept, course, degree, residence, year/sem, institute — no phone/personal email (Section 10.1)
- Archived/deactivated clubs retain past events and history, shown as inactive on the club profile
- Faculty Advisor is **optional** — assigned by AD/Admin, not self-selected; club stays active without one
- Club Lead gets per-club, per-event analytics only

---

# 12. Certificates — *Phase 1 (standard), Phase 3 (customization)*
- Issued automatically once an event is marked Complete (Section 14.1), to every eligible (checked-in) student
- **Phase 1 minimum required fields:** student full name, event name and date, issuing club/department name, signature line. Verification QR reserved in layout but not required until Phase 3.
- **Phase 3:** each event can use a customized template (logo, signature, wording) built on the standard base layout; includes a verification QR code linking to a verification page — prevents forged/edited copies
- Corrections (e.g., misspelled name, missed check-in per Section 14.1) trigger an automatic re-issue — no manual request process needed

---

# 13. Notifications — *Phase 2*
- **Push only** — no email channel for v1. Delivered via FCM (Section 4.2)
- **Real-time delivery** — no digest/batch summaries
- **Critical alerts** (event cancellations, venue/time changes) **cannot be muted** by the student — this is a hard requirement, not a user preference toggle
- **Contextual, on-brand copy** ("Connecting your node...") rather than generic system text — same voice as the async-queue loading copy (Section 4.5)
- **Completion notifications** fire for any action that was queued/delayed (Section 4.5), closing the loop for the user — this includes waitlist promotion (Section 8.3), Mode B check-in confirmation (Section 9.1), and any action that timed out into "still processing"
- Notification preference toggle exists at onboarding (Section 7.2, Screen 4) for *interest-matched event* notifications specifically — this is the only notification category the student has any control over; critical alerts are exempt from this toggle
- Notification rules are a Super Admin System Settings item (Section 6.1) at platform level

---

# 14. Business Logic — Defined Triggers

## 14.1 "Event Marked Complete" — Trigger Definition
- Organizer (AD, Faculty, or Club Lead) manually marks an event Complete after its scheduled end time. Writes `completed_at`/`completed_by`, fires certificate generation for every checked-in student.
- No automatic time-based completion in v1.
- **Post-Complete correction (Phase 2 onward):** if a check-in was missed before Complete was marked, the organizer (or AD/Admin override) can add the missing Attendance record afterward, flagged `added_post_completion: true`. Triggers certificate issuance for that one student only — `reissue_reason: 'post_completion_attendance_add'`. Does not reopen the event or reprocess other students.
- Not part of Phase 1 — no Club Lead/AD/Admin override mechanism exists yet in Phase 1's scope.

## 14.2 Approval SLA — Escalation Path — *Phase 2*
- Day 0–2: submission in AD's queue, normal state
- Day 2+: status flips to "Overdue," visible on AD's dashboard and submitter's status view
- Day 2+: one automatic notification (Section 13) to the relevant Admin, visibility only — no auto-override
- No further auto-escalation in v1; Admin manually decides whether to intervene using existing override power (Section 6.2)

## 14.3 Domain-Verification Failure Behavior — *Phase 1*
See Section 7.6 for full detail (fails open, flags `needs_manual_review`).

---

# 15. Edge Cases

| Scenario | Expected behavior |
|---|---|
| Two check-in attempts race (Mode A + Mode B simultaneously) | First write wins; second rejected with "already marked present" — no duplicate row |
| Student's Verified status flips while a registration is pending | Registration unaffected; verification status is informational/flagged only, never blocking |
| AD account deactivated with items still in their approval queue | **Still open — not yet decided.** Candidate default: queue reassigns to the department's next AD, or escalates to Admin if none exists. Needs a decision before Phase 2. |
| Domain-verification function fails or times out at sign-in | ✅ Resolved: fails open, account flagged `needs_manual_review` (Section 7.6) |
| Organizer marks event Complete, later finds a missed check-in | ✅ Resolved: correctable via post-Complete attendance add, Phase 2 onward (Section 14.1) |

---

# 16. Out of Scope — Deferred to v2
Payments (paid events, merch, competition fees), multi-language support (Hindi/Gujarati — architecture should avoid hard-coding English strings where reasonable, to ease future addition), guest/external (non-Parul) attendee registration, venue/room double-booking conflict detection, geofencing and QR rotation for attendance, gamification/leaderboards/points system.

---

# 17. Open Technical Items

| Item | Status | Resolve by |
|---|---|---|
| Basic RLS (Phase 1 scope) | Defined, not built | Phase 1 |
| Full RLS (Phase 3 scope) | Defined, not built | Phase 3 |
| Domain-verification rewrite for Supabase Auth | Failure behavior defined; rewrite not started | Phase 1 |
| Institute/Course dropdown list | Placeholder, blocks onboarding Screen 2 | Phase 1 |
| QStash throughput vs. concurrent check-in target | **Unverified — highest-priority open risk** | Before Mode B (Phase 2) |
| Manual Postgres backup cadence | Documented, not yet operational | Phase 1 |
| AD deactivation → queue reassignment | Still open | Before Phase 2 |
| Manual-review queue UI for flagged accounts | Deferred by design | Phase 3 |
| Definition of "crucial" items Admin cannot edit in announcements | Pending | Phase 3 |
| Suspicious-activity flagging thresholds | Not yet defined | Phase 3 |
| Scheduled purge/expiry jobs | Not written | Phase 3 |
| Hubs schema integration | Addendum only | Phase 3 |
| Admin's full audit log access (full vs. trimmed) | Pending — leaning full | Phase 3 |

---

# Appendix A — Phase 1 Requirement Traceability

A simple checklist mapping each Phase 1 exit-condition requirement to its defining section, for build tracking and QA sign-off. Mark each row as built and verified before declaring Phase 1's exit condition (Section 5) met.

| ID | Requirement | Defined in | Built? | Verified with real user? |
|---|---|---|---|---|
| P1-01 | Parul domain sign-in (Verified path) | 7.1, 7.6 | ☐ | ☐ |
| P1-02 | Basic RLS — own-record scoping, published-events-only visibility | 4.6 | ☐ | ☐ |
| P1-03 | Onboarding Screens 1, 2, 4 | 7.2 | ☐ | ☐ |
| P1-04 | Event creation — AD/Faculty, auto-verified | 8.1 | ☐ | ☐ |
| P1-05 | Browse + register — Open events, no capacity logic | 8.3 | ☐ | ☐ |
| P1-06 | Attendance Mode A | 9.1 | ☐ | ☐ |
| P1-07 | Event marked Complete (manual trigger) | 14.1 | ☐ | ☐ |
| P1-08 | Certificate auto-issue, standard template | 12 | ☐ | ☐ |
| P1-09 | App load time < 3 sec on campus Wi-Fi | 4.7 | ☐ | ☐ |
| P1-10 | Full loop completed end-to-end by a real person | Section 5 exit condition | ☐ | ☐ |

---

*— End of Document —*
