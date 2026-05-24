# the-compound

Visitor guide app for the Teddy Sheddy compound (React + Express + data parser). The repository name is **the-compound**; the product is often called **Teddy Sheddy** in docs.

## Repository layout

All application code lives in [`app/`](app/). Do not flatten this layout — Heroku deployment uses `git subtree push --prefix app`.

```
the-compound/
├── AGENTS.md          # Instructions for coding agents
├── README.md          # This file
└── app/               # Node app (npm, Vite, Express, parser)
    ├── documentation/
    ├── src/
    └── server.js
```

## Quick start

```bash
cd app
npm install
cp .env.example .env   # fill in values (see documentation)
npm run dev:all        # Vite + API (recommended)
```

- Frontend (dev): http://localhost:5173
- API: http://localhost:3000

For production-like local run: `npm run build && npm start` → http://localhost:3000

## Documentation

| Audience | Location |
|----------|----------|
| Coding agents | [AGENTS.md](AGENTS.md) |
| Architecture & API | [app/documentation/ARCHITECTURE.md](app/documentation/ARCHITECTURE.md) |
| App features & setup | [app/documentation/APPLICATION.md](app/documentation/APPLICATION.md) |
| Environment variables | [app/documentation/ENVIRONMENT_VARIABLES.md](app/documentation/ENVIRONMENT_VARIABLES.md) |
| Deployment (Heroku) | [app/documentation/DEPLOYMENT.md](app/documentation/DEPLOYMENT.md) |

## Deploy

```bash
git subtree push --prefix app heroku main
```

See [app/documentation/DEPLOYMENT.md](app/documentation/DEPLOYMENT.md) for Heroku config vars and monorepo buildpack options.

## Verification

From `app/`:

```bash
npm run check    # lint + typecheck
npm test         # unit tests
npm run validate # check + build
```
