# Sleightbook

[![CI](https://github.com/ahmadafienzidan/sleightbook/actions/workflows/ci.yml/badge.svg)](https://github.com/ahmadafienzidan/sleightbook/actions/workflows/ci.yml)

Personal magic knowledge base with an interactive routine visualizer.

Live demo: https://ahmadafienzidan.github.io/sleightbook/

> Status: the web app runs on a **local data layer** (browser localStorage, seeded with the six-trick library).
> An API (`apps/api`: Hono + Drizzle on PGlite) serves the same data; run the web against it with `bun run dev:with-api`.

## Prerequisites

- Bun 1.3+

## Setup

```bash
bun install
bunx playwright install chromium
```

## Develop

```bash
bun run dev
```

Web: http://localhost:5173 — to reset local data, clear the site's localStorage (key `sleightbook.db.v2`).

## API (optional)

```bash
cp apps/api/.env.example apps/api/.env
bun run dev:api
```

API: http://localhost:3001/api — data lives in `apps/api/.data`. The first start seeds the sample library.
`bun run db:seed` resets it to the sample library, **deleting your favorites and notes**; stop the API first.

To use the API from the web app, run `bun run dev:with-api` instead of `bun run dev` (it sets `VITE_API_URL` from `apps/web/.env.api`).
The GitHub Pages build does not set it, so the live demo keeps using localStorage.

## Verify

```bash
bun run check
bun run test:e2e
bun run test:e2e:api   # same e2e specs against an in-memory API
```

Docs: `docs/superpowers/specs/` (design) and `docs/superpowers/plans/` (implementation plans).
