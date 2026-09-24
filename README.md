# Fabric Plant — Production Module

A production module for a **fabric manufacturing plant**, implemented from
[`SRS_Fabric_Production_Module.md`](./SRS_Fabric_Production_Module.md).
Built with **Next.js (App Router, TypeScript)** and **MongoDB Atlas** (Mongoose).

It implements the SRS "spine" (§11): work orders from sales orders → a
role-scoped **Job Board** → stage-wise production entry with **quantity-in /
quantity-out per stage** and unit changes (kg→m) → **lot/shade** tracking →
**QC grading** → **roll-wise packing** → dispatch, plus **job-work**
dispatch/return and full **roll traceability**.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript |
| Database | MongoDB Atlas via Mongoose 8 |
| Styling | Tailwind CSS 3 |
| API | Next.js Route Handlers (`app/api/**`) |

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure MongoDB Atlas

Copy `.env.example` to `.env.local` and set your Atlas connection string:

```
MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/fabric_production?retryWrites=true&w=majority"
MONGODB_DB="fabric_production"
```

> The repo ships with a **placeholder** URI in `.env.local`. Replace it with a
> real one. A free M0 cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
> is enough. Remember to allow your IP under **Network Access**.

### 3. Seed demo data

Either run the CLI seeder:

```bash
npm run seed
```

…or start the app and click **"Seed demo data"** on any screen (or **Masters →
Reseed demo data**). Seeding is also exposed at `POST /api/seed`.

The seed builds: 9 users (all roles), 4 materials, 2 vendors, 4 machines, 2
products (with BOM + routing), 3 sales orders, and 3 work orders — one driven
end-to-end to **Closed** with a traceable roll (`ROLL-00001`), one mid-flight
with a **job-work** dyeing dispatch/return, and one freshly created.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Mobile / PWA (install on a phone)

The app is a **Progressive Web App** and adapts to phone screens:

- **Responsive layout** — on phones the desktop sidebar is replaced by a bottom
  tab bar (Dashboard · Job Board · Work Orders · Reports · **More**); the *More*
  sheet reaches Machines, Traceability and Masters. Desktop is unchanged.
- **Installable** — a web manifest (`/manifest.webmanifest`), app icons, theme
  color and Apple touch icons are wired up. On Android Chrome use **Add to Home
  screen / Install**; on iOS Safari use **Share → Add to Home Screen**. It then
  launches full-screen (standalone) as "Fabric Prod".
- **Offline-tolerant** — a service worker (`public/sw.js`) caches static assets
  and falls back to a cached shell when offline. It uses a *network-first*
  strategy for pages and never caches `/api/*`, so you never see stale data.

> The service worker registers in **production only** (to keep dev hot-reload
> clean). To try installation on your phone, run a production build on your LAN:
>
> ```bash
> npm run build
> npm start
> ```
>
> then open `http://<your-computer-ip>:3000` on the phone (same Wi-Fi). The
> responsive mobile view itself works in `npm run dev` too — only the install
> prompt needs the production build. Icons can be regenerated with
> `node scripts/generate-icons.mjs` after editing `scripts/icon-source.svg`.

## Using the demo

- **Dashboard** — WIP summary, delivery flags, wastage by stage.
- **Job Board** — kanban across the lifecycle; drag a card or use the `→`
  buttons to advance. Invalid jumps are rejected (can't skip a mandatory stage).
- **Role switch** (top-right) — pick *Stage Supervisor* to see the board scoped
  to a single stage (FR-JB-3).
- **Work Order detail** — issue materials, log stage entries (watch the live
  loss preview flag when loss exceeds the routing standard), create lots, run
  QC, pack rolls, dispatch job-work.
- **Traceability** — enter `ROLL-00001` to trace a roll back through lot →
  shade → stages → materials → vendor (AC-4).

## Project structure

```
app/
  page.tsx                 Dashboard
  job-board/               Kanban board
  work-orders/             List, create, detail (operational hub)
  machines/  reports/  trace/  masters/
  api/                     Route handlers (work-orders, stage-entries, lots,
                           rolls, qc, jobwork, materials, reports/wip, trace, seed…)
components/                Shell, RoleContext, UI primitives, wo/* action forms
lib/                       mongoose (cached conn), domain (statuses/roles/stages),
                           production (WO creation + loss math), api, seed, client
models/                    Mongoose schemas (WorkOrder, StageEntry, Lot, Roll, …)
scripts/seed.ts            CLI seeder
```

## SRS traceability (highlights)

| SRS | Where |
|---|---|
| §3.2 WO lifecycle + transitions | `lib/domain.ts`, `app/api/work-orders/[id]/transition` |
| §3.3 qty-in/out per stage | `models/StageEntry.ts`, `lib/production.ts#deriveLoss` |
| FR-WO-1/4 create + snapshot specs | `lib/production.ts#createWorkOrder` |
| FR-JB-1..6 job board | `app/job-board`, `app/api/reports/wip` |
| FR-LOT lots/shades | `models/Lot.ts`, `app/api/lots` |
| FR-PK roll packing | `models/Roll.ts`, `components/wo/PackForm.tsx` |
| FR-QC grading + defects | `models/QcInspection.ts`, `components/wo/QcForm.tsx` |
| FR-JW job-work | `models/JobworkDispatch.ts`, `app/api/jobwork` |
| AC-4 traceability | `app/api/trace/[rollNo]` |

## Notes / placeholders

- **Auth is a placeholder**: the current role is chosen from the header and
  kept in `localStorage`. Wire real auth (e.g. NextAuth) before production.
- Sales/CRM and Inventory are **stubbed** inside this module per SRS §10.1;
  finished rolls and consumption are written locally rather than pushed to a
  separate service.
- Swatch images, lab-dip references and barcode/QR label printing are
  represented as fields/flags, not live integrations.
