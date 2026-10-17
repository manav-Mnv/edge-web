<div align="center">

# EDGE: Every Node, Connected

**The web foundation for EDGE, a campus engagement platform for Parul University: events, registrations, attendance and certificates in one place.**

![Status](https://img.shields.io/badge/status-in%20development-dbab09?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js%2016-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React%2019-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase%20FCM-FFCA28?style=flat-square&logo=firebase&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS%204-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)

</div>

---

## About

EDGE connects students, clubs and faculty around campus events. Phase 1 builds one golden path from end to end:

**Sign in → Onboarding → Event → Registration → Attendance → Certificate**

This repo is **Stage 0** of that plan: the Next.js app scaffold, Supabase and Firebase clients, the environment specification, and the product documents. Development has since continued in [Puma](https://github.com/manav-Mnv/puma).

## Tech stack

| Layer | Tools |
| --- | --- |
| Web app | Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 · lucide-react |
| Data and auth | Supabase (Postgres, Auth, Row Level Security), restricted to the university email domain |
| Push notifications | Firebase Cloud Messaging (web client + Admin SDK) |
| Async jobs (planned) | Upstash QStash |

## Getting started

```sh
npm install
cp .env.example .env.local   # Supabase, Firebase and allowed email domain
npm run dev
```

Open http://localhost:3000.

## Documentation

| Document | What it covers |
| --- | --- |
| [`docs/EDGE_PRD_v2.0.md`](docs/EDGE_PRD_v2.0.md) | Product requirements |
| [`docs/EDGE_SRS_v2.0.md`](docs/EDGE_SRS_v2.0.md) | Technical source of truth |
| [`docs/EDGE_Phase1_Detailed_Plan.md`](docs/EDGE_Phase1_Detailed_Plan.md) | Stage-by-stage Phase 1 build plan |

## Project structure

```
src/
├── app/              Layout, landing page, global styles
└── lib/
    ├── supabase/     Browser and server clients
    ├── firebase/     Web client and Admin SDK
    ├── constants.ts
    └── utils.ts
docs/                 PRD, SRS, Phase 1 plan
```

## Author

**[Manav](https://github.com/manav-Mnv)**: product and idea lead.
