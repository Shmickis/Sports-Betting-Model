# TrueLine Command Center

Analytical decision-support desk for disciplined sports betting. Seeded from your Google Drive TrueLine ledger.

## Architecture (preserve)

- **Framework:** Next.js 16 App Router, TypeScript, Tailwind CSS v4
- **DB:** SQLite via better-sqlite3 + Drizzle (`data/trueline.sqlite`), ready to later swap to Postgres/Supabase
- **Design:** Dark analytics terminal (`src/app/globals.css` + `AppShell`)
- **Math:** Pure functions in `src/lib/calcs.ts` (tested)
- **Queries:** `src/lib/queries.ts` — no invented missing data

## Run

```bash
cd lineforge
npm install
npm run dev        # http://localhost:3000 → /dashboard
npm test
npm run typecheck
npm run lint
npm run build
```

## Working sections

| Route | Status |
|---|---|
| `/dashboard` | Metrics, filters, alerts, Official vs non-Official |
| `/edge-watch` | Manual entry, reclass → PLAY/PASS with history + alerts |
| `/analyzer` | Full evaluation + save research / edge / executed / PASS |
| `/ledger` | Permanent table, audit corrections, CSV/JSON import-export |
| `/clv` | Checkpoints + labels (unconfirmed/directional/confirmed) |
| `/briefs` | Morning / Afternoon / Nightly manual briefs |
| `/research` | Notes + robustness checklist gate |
| `/performance` | Sport breakdown + sample-size warnings |
| `/bankroll` | Transactions + unit sizing |
| `/settings` | Unit/bankroll/timezone + disconnected integration adapters |

Legacy hub APIs (`/api/hub`, `/api/stream`, `/api/updates`) remain for compatibility.

## Integrity defaults

Manual data mode until an integration reports connected. CLV Unconfirmed without closes. Unit edits never rewrite historical `$` stakes.
