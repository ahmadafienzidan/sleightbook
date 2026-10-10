# Sleightbook

[![CI](https://github.com/ahmadafienzidan/sleightbook/actions/workflows/ci.yml/badge.svg)](https://github.com/ahmadafienzidan/sleightbook/actions/workflows/ci.yml)

Personal magic knowledge base with an interactive routine visualizer.

Live demo: https://ahmadafienzidan.github.io/sleightbook/

> Status: the web app runs on a **local data layer** (browser localStorage, seeded with the six-trick library).
> A standalone API (`apps/api`: Hono + Drizzle on PGlite) serves the same data; the web app is not wired to it yet.

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
bun run db:seed
bun run dev:api
```

API: http://localhost:3001/api — data lives in `apps/api/.data` (stop the API before re-seeding).

## Verify

```bash
bun run check
bun run test:e2e
```

Docs: `docs/superpowers/specs/` (design) and `docs/superpowers/plans/` (implementation plans).
