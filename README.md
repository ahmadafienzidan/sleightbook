# Sleightbook

[![CI](https://github.com/ahmadafienzidan/sleightbook/actions/workflows/ci.yml/badge.svg)](https://github.com/ahmadafienzidan/sleightbook/actions/workflows/ci.yml)

Personal magic knowledge base with an interactive routine visualizer.

Live demo: https://ahmadafienzidan.github.io/sleightbook/

> Status: MVP1 web app runs on a **local data layer** (browser localStorage, seeded with Ambitious Card).
> The API/database (Part 2) is postponed; see `docs/superpowers/plans/`.

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

Web: http://localhost:5173 — to reset local data, clear the site's localStorage (key `sleightbook.db.v1`).

## Verify

```bash
bun run check
bun run test:e2e
```

Docs: `docs/superpowers/specs/` (design) and `docs/superpowers/plans/` (implementation plans).
