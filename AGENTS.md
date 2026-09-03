# Agent instructions — the-compound

Canonical guide for coding agents working in this repository.

## Layout

- **All application code is under `app/`.** Run npm commands from `app/`.
- Do **not** move the app to the repo root. Heroku deploys via `git subtree push --prefix app`.
- Repo name: `the-compound`. Product name in docs: Teddy Sheddy.

## Commands (run from `app/`)

| Command | Purpose |
|---------|---------|
| `npm run dev:all` | Start Vite (:5173) and Express (:3000) together |
| `npm run dev` | Vite only |
| `npm start` | Express API + serves `dist/` |
| `npm run build` | TypeScript check + Vite production build |
| `npm run lint` | ESLint (TS/TSX + server/parser JS) |
| `npm run typecheck` | `tsc -b` only |
| `npm run check` | lint + typecheck |
| `npm run validate` | check + build |
| `npm test` | Vitest unit tests |
| `npm run parse` | Run data parser CLI |
| `npm run parse-debug` | Parser debug with fixture input |
| `npm run update-data` | Copy parser output → `public/compound-places.json` |
| `npm run seed-local` | Copy sample places fixture for local API |
| `npm run sync-tides` | Sync tide predictions from NOAA/USNO if coverage is stale |
| `npm run sync-tides:force` | Force a full tide resync regardless of coverage |

## Dev workflow

1. Copy `app/.env.example` → `app/.env` and fill required values.
2. Run `npm run dev:all` (or `npm run dev` + `npm start` in two terminals).
3. Vite proxies `/api` to Express on port 3000.

Without Express, auth, `/api/compound-places`, and protected routes will not work in dev.

## Environment

- Template: [`app/.env.example`](app/.env.example)
- Full reference: [`app/documentation/ENVIRONMENT_VARIABLES.md`](app/documentation/ENVIRONMENT_VARIABLES.md)
- `server.js` loads `.env` via `dotenv` (not `.env.local` unless you configure it).

**Never commit** `.env`, credentials JSON, or real secrets.

## Parser pipeline

```
Google Doc → app/src/parser/ → src/parser/output/compound-places.json
                                    ↓
                          GCS (production) or public/ (local, GCS disabled)
                                    ↓
                          GET /api/compound-places → React UI
```

- Parser uses **OpenAI + Langchain** (in-app AI for data extraction, not agent tooling).
- House mechanics markdown: production in GCS; local dev uses `app/fixtures/house-mechanics/` (not `public/`).

## Tides

```
NOAA CO-OPS + USNO → app/src/tides/sync.js → tide-predictions.json → GET /api/tides → TideChart.tsx
```

- `app/src/tides/` is intentionally isolated from `app/src/parser/` — it must never `require`
  parser config at module load time, since that throws if OpenAI/Google env vars are missing and
  `/tides` is a public route with no dependency on the parser.
- Both upstream APIs (NOAA CO-OPS, USNO) are keyless; no new secrets.
- No scheduler exists (`Procfile` is `web: npm run start` only) — coverage is maintained by a lazy
  self-heal on each `/api/tides` request (`ensureCoverage` in `sync.js`), plus `npm run sync-tides`
  for manual/first runs.
- Local dev with zero `.env` still works via the committed `app/fixtures/tide-predictions.sample.json`.

Details: [`app/documentation/ARCHITECTURE.md`](app/documentation/ARCHITECTURE.md)

## Code conventions

| Area | Stack |
|------|-------|
| `app/src/components/`, `App.tsx` | TypeScript, React 19, Mantine, React Router |
| `app/server.js`, `app/src/parser/`, `app/src/tides/`, `app/utilities/` | CommonJS JavaScript |

Match existing patterns in each folder. Do not convert parser to TypeScript unless asked.

## Auth

- JWT + bcrypt in [`app/server.js`](app/server.js)
- Roles: `guest` (Shady/Lofty), `admin` (dashboard, parser)
- Generate hashes: `node utilities/generate-password.js admin` / `guest`

## Lint scope

- ESLint covers `**/*.{ts,tsx}` and `server.js`, `utilities/**/*.js`, `src/parser/**/*.js`, `src/tides/**/*.js`
- Run `npm run check` before finishing tasks

## Security

- Do not put guest-only content in `public/` (Vite copies it to `dist/` and it may be served statically).
- Do not use default `JWT_SECRET` or placeholder password hashes in production.
- Production boot fails if required secrets are missing or still defaults.

## Do not

- Force-push `main`
- Commit `.env` or credential files
- Flatten `app/` to repo root without updating deploy docs
- Add secrets to committed files or agent responses

## After changes

```bash
cd app && npm run check && npm test
```

For parser/schema/server changes, run relevant tests and `npm run validate` when touching build output.
