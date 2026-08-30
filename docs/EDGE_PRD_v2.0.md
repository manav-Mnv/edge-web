# EDGE
*Every Node, Connected.*

**Product Requirements Document**
Parul University — Campus Engagement Platform

**Version 2.0 — Baseline**

---

## Document Control

| Field | Value |
|---|---|
| Document title | EDGE Product Requirements Document |
| Version | 2.0 (Baseline) |
| Status | Approved for Phase 0/1 build — living document |
| Prepared by | Mnv (Product/Idea Lead) + Claude |
| Companion document | EDGE Software Requirements Specification (SRS) v2.0 — technical source of truth |
| Change control | Rollout plan and phase scope (Section 1.4) should not change without deliberate reconsideration; feature-level detail may be refined as design/build progresses |

## Revision History

| Version | Description |
|---|---|
| 1.0–1.2 | Original → web-first sequencing |
| 1.3 | Supabase + Firebase(FCM) noted (backend-only) |
| 1.4–1.6 | Phase exit conditions, certificate content, partial user stories — too aggressively summarized, losing detail |
| 1.7 | Full rebuild of product-level detail, Faculty user story added |
| 1.8 | Fixed cross-reference after SRS renumbering |
| 1.9 | Team size and timeline restored; AD's phase tag fixed in two places |
| **2.0** | **Baseline release.** Added Document Control, a Problem Statement, explicit Goals/Non-Goals, a competitive framing note, and a Success Metrics section flagging which targets still need real numbers. This is the version to hand to a new team member or stakeholder cold. |

---

# 1. Overview

## 1.1 Purpose
EDGE is a campus engagement system for Parul University — event discovery, registration, attendance, club management, certificate issuance, and administrative oversight — built web-first, with a React Native app to follow once the web platform is pilot-validated.

## 1.2 Problem Statement
Campus events, club management, and attendance tracking at Parul University currently happen through fragmented, manual processes — spreadsheets, WhatsApp groups, paper sign-in sheets, and ad hoc certificate generation. There is no single system that connects event discovery, registration, attendance, and certification, and no consistent approval hierarchy governing who can create or verify campus activity. EDGE replaces this fragmentation with one platform covering the full lifecycle, with role-based oversight scaled to a 30,000-person campus.

## 1.3 Goals & Non-Goals

**Goals for v1:**
- Prove the full lifecycle (discovery → registration → attendance → certification) works reliably for a real club before expanding further
- Keep infrastructure cost at effectively zero while still supporting up to 30,000 users at full rollout
- Establish a role hierarchy that scales from a single small club to full campus administration without redesign

**Explicit non-goals for v1** (see Section 10 for the full deferred list):
- EDGE is not trying to be a payments platform, a general-purpose event-ticketing tool, or a guest-management system for external attendees
- EDGE is not trying to gamify engagement (no points, leaderboards) in this version
- EDGE is not trying to support every language on day one — only avoiding architecture choices that would make adding languages later harder

## 1.4 Build Philosophy
- Web first, sequential — mobile app starts only after the web pilot validates core logic
- One golden path before any breadth — a single student registering, checking in, and getting a certificate, fully working, comes before any additional feature, role, or platform
- No feature ships until the previous one works for a real user

## 1.5 Rollout Plan & Phase Exit Conditions

| Phase | Scope | Exit condition |
|---|---|---|
| **Phase 1** | Auth (Verified path), Event creation (AD/Faculty), browse/register (Open events), Attendance Mode A, certificates | One real person completes the full loop — sign in, register, get scanned, get a correct certificate — on web |
| **Phase 2** | Club Lead + full Clubs functionality, AD approval flow, Attendance Mode B, push, Sheets sync, temp UG-number signup, feedback | Swift Coding Club runs one real event through registration → certificate with no critical failure |
| **Phase 3** | Full feature breadth, Admin/Super Admin tooling, Hubs, mobile app | Campus-wide rollout live on both platforms, full role hierarchy enforced |

## 1.6 Success Criteria (Pilot)
No rigid numeric targets for v1. Success is defined as: smooth end-to-end operation (registration → attendance → certificate) with no critical failures, real adoption by Swift Coding Club members, and bugs/UX issues surfaced and fixed before campus-wide launch.

## 1.7 Team & Timeline
Total team: 4 people — Design (UI/UX, App + Web), Backend (2), Product/Idea. Target timeline: ASAP — no fixed date, prioritizing readiness over a deadline.

## 1.8 Competitive Context
Luma was used as a UX reference point during design discussions and confirmed to be web-first/PWA rather than native-app-first — this supported EDGE's own web-first sequencing decision. EDGE differs from general event tools like Luma in one structural way: it's built around a **university approval hierarchy** (AD/Admin/Super Admin oversight), not just self-service event creation — this is the core reason EDGE couldn't simply be "Luma for Parul" and needed its own role/approval system from the ground up.

---

# 2. Users & Roles
Hierarchy: **Super Admin → Admin → AD (Department Admin) → Club Lead / Faculty → Student**

| Role | Created by | Key powers | Key restriction | Build phase |
|---|---|---|---|---|
| Super Admin | Seeded manually | Full unscoped visibility, System Settings, override power | — | Phase 3 |
| Admin | Super Admin only | Cross-dept visibility, overrides AD decisions | No System Settings; can't edit "crucial" announcements | Phase 3 |
| AD | Admin only | Approves club/event requests (Phase 2), creates events directly (Phase 1) | Scoped to own dept; 2-day approval SLA | **Phase 1 + 2** — see note |
| Club Lead | Self-initiated → AD-approved | Creates/manages club events, membership | Cannot remove members | Phase 2 |
| Faculty | Assigned | Creates events (Phase 1), can be Club Advisor (Phase 2) | Scoped to supervised events/clubs | **Phase 1 + 2** — see note |
| Student | Self-signup | Registers, joins clubs, gets certificates | Verified/Unverified identity states | **Phase 1** (Verified only, event registration) — club-joining is Phase 2 |

*Note on split-phase roles: AD and Faculty both have a Phase 1 capability (direct, auto-verified event creation) and a Phase 2 capability that depends on Clubs existing (AD's approval authority; Faculty's Club Advisor assignment). Earlier drafts flattened both to a single phase tag each, which contradicted their own documented Phase 1 capability — corrected as of v2.0. Full detail: SRS Section 6.*

## 2.1 Hubs (Phase 3)
Optional umbrella groupings above Clubs. AD-created only. Adds a "Director" **label** — not a new role, no new permission tier. Full detail in SRS Section 6A.

## 2.2 Core User Stories

- **As a Student**, I want to find events matching my interests and register in a couple of taps, so that I don't have to hunt for what's happening on campus.
- **As a Student**, I want my certificate to arrive automatically after an event, so that I don't have to request or chase it down.
- **As a Faculty member**, I want to create and run my own events without waiting on anyone's approval, so that I can organize department activities on my own timeline.
- **As a Faculty member**, I want to be assignable as lead on an AD-created event with full edit rights, so that I can run department events I didn't personally create.
- **As a Club Lead**, I want to create an event and know exactly where it stands in approval, so that I'm not left guessing whether it will happen.
- **As a Club Lead**, when a member is disruptive or shouldn't be in the club anymore, I have no way to remove them myself — only they can leave. This is an intentional platform constraint (SRS Section 11), but design should account for it: a clear "report to AD" path gives Club Leads real recourse instead of none.
- **As an AD**, I want a clear, fast way to approve or reject club/event requests in my department, so that I'm not the bottleneck for my department's activity.
- **As an Admin**, I want visibility across departments without having to re-approve routine things myself, so that I can focus on genuine exceptions.
- **As a Super Admin**, I want a single place to control platform-wide settings, so that I don't have to touch individual departments to make a global change.

*(Full story set can expand per-feature during Phase 2/3 design; this is the minimum needed to unblock current UI/UX work.)*

---

# 3. Onboarding & Identity

## 3.1 Sign-Up Paths
- **Path A** (Phase 1): Student with Parul email — Google Sign-In or email/password, domain-checked, instant `Verified`
- **Path B** (Phase 2): Fresher with temporary UG number — manual signup, `Unverified` until real Parul email is linked; fully usable in the meantime; unverified status flagged (not blocking) on HOD-facing attendance sheets
- No phone OTP in v1 — ruled out due to Firebase Phone Auth's per-SMS billing requirement, independent of the rest of the stack

## 3.2 Onboarding Flow (Student)
4-screen flow: Basics (name, PU mail, enrollment — Phase 1) → Academic & Campus Profile (institute, course, year, mobile, personal email — Phase 1) → Interests & Clubs (Phase 2, since it depends on Clubs existing) → Final Touches, optional (Phase 1).

Faculty/AD onboarding captures: Name, PU Mail, Designation, Department, MIS ID, Mobile, Personal Email, assigned club advisory roles.

## 3.3 What This Depends On
The Institute/Course dropdown needs a full official reference list from the university — currently a placeholder hybrid dropdown. This blocks a real Phase 1 onboarding screen, not just a nice-to-have.

## 3.4 Sign-In Reliability
If the domain-verification check fails or times out, the person is let through rather than blocked, and their account is quietly flagged for a manual look later — the priority is not locking a real student out over a technical hiccup. Full mechanics in SRS Section 7.6.

---

# 4. Events

## 4.1 Creation & Approval
| Creator | Approval needed | Verification | Phase |
|---|---|---|---|
| AD | No | Auto-verified | **Phase 1** |
| Faculty | No | Auto-verified | **Phase 1** |
| Club Lead | Yes — AD approval | Verified after approval | Phase 2 |

Rejections retain AD remarks; resubmission allowed. Approval SLA: 2 days, then flagged overdue — overdue items automatically notify the relevant Admin for visibility (no auto-override). Admin can override any AD decision.

## 4.2 Access Control (Phase 3)
- Open: standard registration, capacity + waitlist
- Invite-Only: manual invite list and/or shareable link; link requires Parul sign-in before granting access; non-invited attempts blocked with a clear message

## 4.3 Registration & Capacity (Phase 1: Open only; Phase 3: full logic)
- Waitlist promotion: automatic, instant, no confirmation window, triggers notification
- Overlapping registration: soft warning only, never a hard block
- Cancellations visible only to the cancelling student

## 4.4 Co-Hosting, Recurring Events, Tags & Discovery (Phase 3)
- Two or more clubs can co-host a single event; events can span multiple departments
- Recurring events: pattern defined once, each instance tracked independently
- 1–3 tags per event from a fixed platform-wide vocabulary, powering both search/filter and the interest-based "Recommended for You" feed

## 4.5 Post-Event Feedback (Phase 2)
Default question set per event; Club Lead can customize per event.

## 4.6 Event Completion & Certificate Trigger
An organizer manually marks an event Complete once it's actually finished — this is what triggers certificates for everyone who checked in. If someone's check-in was missed before Complete was marked, the organizer can add it afterward (Phase 2 onward), which automatically issues that one student a certificate without reopening the whole event.

## 4.7 Out of Scope for v1
Paid/ticketed events, room double-booking detection, non-Parul guest registration.

---

# 5. Attendance

## 5.1 Two Modes
- **Mode A** (Phase 1) — Individual Scan: organizer scans each student's ticket, one at a time
- **Mode B** (Phase 2) — Screen Self Check-in: shared QR, students self-scan in parallel; deep-links into the app if installed, web fallback otherwise. This is the mode with real concurrency, which is why it's the one requiring the async queue system.

Both write to the same Attendance record — no duplicates, regardless of mode or device.

## 5.2 Fallbacks (Phase 3)
Manual entry for no camera / no internet, queues locally and syncs when connection returns.

## 5.3 Certificate Eligibility
No minimum attendance threshold in v1 — any successful check-in counts once the event is marked Complete.

## 5.4 Deferred to v2
Geofencing, QR rotation.

---

# 6. Clubs (Phase 2)
- Only Club Lead can request creation; AD approves
- Multi-club membership allowed; leave anytime; **Club Lead cannot remove members** — this is intentional, and the recommended design mitigation is a clear "report to AD" path (see Section 2.2 user story)
- Archived clubs retain history, shown as inactive
- Faculty Advisor optional

---

# 7. Certificates
**Phase 1 — minimum fields:** student name, event name/date, issuing club/department, signature line. Verification QR reserved in layout but required only from Phase 3.

**Phase 3 — full customization:** logo, signature, wording, verification QR linking to a public verification page. Corrections (misspelled name, missed check-in) trigger automatic re-issue — no manual request process.

---

# 8. Notifications (Phase 2)
- Push only — no email channel for v1
- Real-time delivery — no digest/batch summaries
- Critical alerts (cancellations, venue/time changes) cannot be muted by the student
- On-brand contextual copy ("Connecting your node...") rather than generic system text
- Completion notifications close the loop on any queued/delayed action

---

# 9. Data, Privacy & Trust (Phase 3, documented from Phase 1)
- Visibility split: Club Lead sees academic/identity fields only; AD/Admin/Super Admin also see phone + personal email (full matrix: SRS Section 10.1)
- Data retained while Parul email account is active; 20-day grace window after deletion
- Explicit consent checkbox at signup (DPDP Act 2023)
- Self-drafted Terms/Privacy Policy for v1; legal review only if EDGE scales beyond the university
- Students can report inappropriate content; AD reviews, escalates to Admin as needed
- In-app "Report an Issue" routes to Admin
- Automated flagging for suspicious activity (e.g., mass self-scan attempts); AD/Admin can suspend individual admin privileges without deactivating a whole club

---

# 10. Out of Scope — Deferred to v2
Payments (paid events, merch, competition fees), multi-language support (Hindi/Gujarati — avoid hard-coded English strings now to ease this later), guest/external (non-Parul) attendee registration, venue/room double-booking conflict detection, geofencing and QR rotation, gamification/leaderboards/points system.

---

# 11. Success Metrics — What Still Needs Real Numbers

The qualitative pilot criteria (Section 1.6) are solid for Phase 2, but nothing beyond that has a numeric target yet. Flagging this honestly rather than inventing numbers that haven't been discussed:

| Metric | Status |
|---|---|
| Target registration rate (% of club members who register for a pilot event) | **Not yet defined** |
| Target check-in completion rate (% of registered students who actually check in) | **Not yet defined** |
| Target certificate issuance turnaround (time from event Complete to certificate delivered) | **Not yet defined** — architecturally near-instant via the queue system, but no stated target |
| Campus-wide adoption target for Phase 3 (e.g., % of 30,000 students with an account within X months) | **Not yet defined** |

These aren't blocking Phase 1 or Phase 2 — the qualitative pilot criteria are enough to know if the pilot worked. But before Phase 3 planning starts in earnest, at least the campus-wide adoption target is worth defining, since it affects how urgently the Firestore-style scale concerns (already resolved architecturally via Supabase) get revisited operationally.

---

# 12. Open Product Questions

| Item | Status |
|---|---|
| Definition of "crucial" items Admin can't edit in announcements | Pending |
| Admin's full audit log access (full vs. trimmed) | Pending — leaning full |
| Full Institute/Course dropdown list | Pending — blocks a real Phase 1 onboarding screen |
| Final app branding assets | Partially resolved — Figma design system built (glassmorphism direction, 6 pages, 10 color styles, 6 text styles); full brand lockup pending |
| Hubs — full integration into roles/permissions data model | Pending — currently an addendum only (SRS Section 6A) |
| AD account deactivated mid-approval-queue | Still open — needs a decision before Phase 2 (SRS Section 15) |
| Success metrics (Section 11) | New in v2.0 — not yet defined, not blocking |
| ~~Sign-in failure behavior if domain verification times out~~ | ✅ Resolved — fails open, account flagged for manual review (SRS Section 7.6) |
| ~~Database architecture~~ | ✅ Resolved — Supabase + Firebase(FCM) |

---

*— End of Document —*
