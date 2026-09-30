# Sleightbook — Desain MVP Phase 1 (Vertical Slice: Ambitious Card)

**Tanggal:** 2026-09-26
**Status:** Draft — menunggu review user
**Sumber:** [`docs/reference/Sleightbook-SRS.md`](../../reference/Sleightbook-SRS.md), [`docs/reference/CONVENTIONS.md`](../../reference/CONVENTIONS.md), [`docs/reference/sleightbook-prototype.html`](../../reference/sleightbook-prototype.html)

Dokumen ini adalah spesifikasi final untuk MVP Phase 1. Bila bertentangan dengan SRS atau CONVENTIONS, **dokumen ini yang berlaku**. Deviasi dicatat eksplisit di §8.

---

## 0. Keputusan yang Sudah Diambil

| # | Topik | Keputusan |
|---|---|---|
| D1 | Acuan frontend | **Hybrid** — layering, penamaan, prefix `I`/`T`, named export, Zustand dari CONVENTIONS; styling Tailwind + Motion dari SRS; Hono RPC client (`hc`) menggantikan axios |
| D2 | Auth | **Single-user, siap multi** — belum ada login; semua tabel punya `userId` yang diisi satu user default |
| D3 | Scope MVP1 | **Full-stack tipis** — monorepo Bun + Hono + Drizzle + Postgres, hanya endpoint yang dibutuhkan slice ini |
| D4 | Spectator vs Secret | **Masuk MVP1** — toggle di visualizer |
| D5 | Postgres dev | **Docker lokal** (docker compose, Postgres 16) |
| D6 | Bahasa UI | **i18n dua bahasa** — English (default) + Bahasa Indonesia |
| D7 | Engine visualisasi | **Pendekatan A** — reducer state murni + proyeksi + layout, renderer deklaratif |
| D8 | Git | Repo sudah `git init`; **tidak ada commit** sampai user mengizinkan |

---

## 1. Scope

### Masuk MVP1

Alur SRS §32 Phase 1, ditambah Secret View:

```text
Buka app → Trick Detail "Ambitious Card" → Routine "Standard" (5 fase)
→ Visualizer (play / pause / next / prev / replay / speed / pilih fase / toggle penjelasan)
→ Toggle Spectator ⇄ Secret
→ Breakdown tersinkron + teknik per fase
→ Favorite (persist) → Personal notes trick & fase (persist)
```

### Tidak masuk MVP1 (dan tidak ditampilkan di UI)

Library grid/search/filter, halaman Technique, halaman Gimmicks, multiple routine / variations, practice mode & tracking, semua fitur AI, Settings. **Aturan UI:** tidak ada tombol "mati" — elemen yang belum berfungsi tidak dirender (memperbaiki masalah prototipe). Konten domain (hasil seed) hanya berbahasa Inggris; i18n hanya untuk string UI.

---

## 2. Struktur Monorepo

Bun workspaces.

```text
sleightbook/
├── apps/
│   ├── web/                 React 19 + Vite + Tailwind v4 + Motion + React Router + Zustand
│   └── api/                 Bun + Hono + Drizzle + Zod
├── packages/
│   ├── shared/              Zod schemas + tipe domain & kontrak API (tanpa dependency runtime selain zod)
│   └── engine/              Engine visualisasi — TypeScript murni, tanpa React/DOM
├── docs/
├── docker-compose.yml       Postgres 16 (db dev `sleightbook`, db test `sleightbook_test`)
├── biome.json
├── tsconfig.base.json       strict, noUnusedLocals, noUnusedParameters, noFallthroughCasesInSwitch
└── package.json
```

Arah dependency (tidak boleh terbalik):

```text
web ──► shared, engine
api ──► shared, engine
engine ──► shared
shared ──► (zod saja)
```

Package di-import lewat nama workspace (`@sleightbook/shared`, `@sleightbook/engine`) dengan subpath langsung ke file (mis. `@sleightbook/shared/schemas/routine`) — tanpa barrel `index.ts`, sesuai CONVENTIONS.

---

## 3. Model Data (Postgres + Drizzle)

Semua tabel: `id uuid default gen_random_uuid()`, `createdAt`, `updatedAt` (timestamptz). Semua FK anak → induk `ON DELETE CASCADE`.

```text
users             id, name
tricks            id, userId→users, name, slug (unique per user), description,
                  category   enum(card|coin|mentalism|gimmick),
                  difficulty enum(beginner|intermediate|advanced),
                  durationMin int, durationMax int, isFavorite bool default false
routines          id, trickId→tricks, name, description, isDefault bool, position int,
                  tips text[] default '{}'
phases            id, routineId→routines, position int, name,
                  summary text        -- label pendek di strip fase
                  explanation text    -- metode sebenarnya (Secret View / breakdown)
                  spectatorText text  -- yang dipersepsikan penonton
                  UNIQUE(routineId, position)
actions           id, phaseId→phases, position int, type text, params jsonb, durationMs int
                  UNIQUE(phaseId, position)
techniques        id, userId→users, name, description, difficulty, category text,
                  tips text[], commonMistakes text[]
items             id, userId→users, kind enum(prop|gimmick), name, description, setupNotes
phase_techniques  phaseId→phases, techniqueId→techniques   PK(phaseId, techniqueId)
routine_items     routineId→routines, itemId→items         PK(routineId, itemId)
notes             id, userId→users, body text,
                  trickId?, routineId?, phaseId?, techniqueId?, itemId?  (FK nullable)
                  CHECK (num_nonnulls(trickId, routineId, phaseId, techniqueId, itemId) = 1)
```

Aturan:

- Variasi = routine lain dari trick yang sama (tidak ada tabel variasi).
- Strip fase, breakdown, dan timeline engine **membaca data `phases` yang sama**.
- Teknik routine = gabungan teknik seluruh fasenya (dihitung, tidak disimpan).
- Props di hero = `items` milik routine default.
- `actions.type` + `actions.params` wajib lolos `ActionSchema` (§4.2) sebelum ditulis; DB tidak pernah menyimpan action yang tidak dikenal.
- Satu tempat untuk user aktif: `getCurrentUserId()` di `apps/api/src/services/currentUser.ts` (MVP1 mengembalikan `DEFAULT_USER_ID` dari seed). Auth nanti cukup mengganti fungsi ini.

**Seed MVP1:** user default; trick Ambitious Card (card, intermediate, 5–8 min); routine "Standard" (isDefault) dengan 5 fase dan action pada §4.5; teknik Double Lift, Card Insertion, Snap, Spread/Fan; item prop "Deck of cards"; 4 pro tips dari prototipe; 1 note trick contoh. Seed idempoten (hapus-lalu-isi untuk user default).

---

## 4. Engine Visualisasi (`packages/engine`)

TypeScript murni, deterministik, tanpa I/O. Semua fungsi dapat diuji dengan `bun test`.

### 4.1 Model state

```ts
type TFace = "up" | "down";

interface ICard {
  id: string;            // "c1", "c2", …
  label: string;         // identitas asli, mis. "AH" (A♥) atau "X" (indifferent)
  face: TFace;
  perceivedAs: string | null; // identitas yang diyakini penonton; null = sama dengan label
}

interface ISceneState {
  cards: Record<string, ICard>;
  deck: string[];                 // id kartu bernama, index 0 = paling atas
  restCount: number;              // jumlah kartu anonim di bawah kartu bernama (dirender sebagai blok deck)
  lifted: { cardIds: string[]; asOne: boolean } | null; // kartu terangkat di atas deck
  hand: string[];                 // kartu terpisah di tangan kanan
  buried: string[];               // kartu bernama yang sudah "hilang" di tengah deck (di antara blok restCount)
  jogged: string | null;          // kartu di `buried` yang masih menonjol dari deck
  spread: boolean;                // deck dalam posisi fan
  beat: boolean;                  // true hanya pada frame "snap" (efek visual)
}
```

### 4.2 Kosakata action MVP1

Didefinisikan sebagai Zod discriminated union `ActionSchema` di `packages/shared/src/schemas/action.ts`; engine memakai tipe hasil `z.infer`.

| `type` | `params` | Efek pada state |
|---|---|---|
| `setupDeck` | `{ named: {label}[], restCount }` | Deck baru; kartu bernama di atas (urut), semua face down |
| `doubleLift` | `{ count: 2 }` (2–4) | `count` kartu teratas → `lifted`, `asOne = true` |
| `turnOver` | `{ target: "lifted" \| "top" }` | Balik unit: urutan dibalik, face ditukar. Jika `lifted.asOne` dan hasilnya face up, semua kartu di unit diberi `perceivedAs` = label kartu yang terlihat |
| `replace` | `{}` | `lifted` → kembali ke atas `deck`, `lifted = null` |
| `takeTop` | `{ count: 1 }` | `count` kartu teratas deck → `hand` (mempertahankan `perceivedAs`) |
| `insert` | `{ depth: "middle" }` | Kartu terakhir di `hand` → `buried` (dirender di tengah tinggi blok deck), `jogged = id` |
| `square` | `{}` | `jogged = null`, `spread = false` |
| `snap` | `{}` | `jogged = null`, `beat = true` (reset ke false pada action berikutnya) |
| `revealTop` | `{}` | Kartu teratas deck → face up, `perceivedAs = null` |
| `spread` | `{}` | `spread = true` |

`durationMs` tiap action default 700 (disimpan per action di DB; boleh override).

### 4.3 Fungsi publik

```ts
applyAction(state: ISceneState, action: TAction): ISceneState          // murni; throw EngineError
buildTimeline(phases: IPhaseInput[]): ITimeline                         // lihat 4.4
validateRoutine(phases: IPhaseInput[]): { ok: true } | { ok: false; error: IEngineErrorInfo }
project(state: ISceneState, view: "spectator" | "secret"): IProjectedScene
layout(scene: IProjectedScene): IRenderNode[]                           // koordinat untuk SVG
```

`EngineError` memiliki `code` (`NO_LIFTED`, `DECK_TOO_SMALL`, `HAND_EMPTY`, `NOT_SETUP`, …), `phaseIndex`, `actionIndex`. `validateRoutine` dipakai oleh test seed sekarang dan oleh API saat menerima routine dari AI di Phase 4.

### 4.4 Timeline & semantik kontrol

```ts
interface IFrame { phaseIndex: number; actionIndex: number; state: ISceneState; durationMs: number }
interface ITimeline { initial: ISceneState; frames: IFrame[]; phaseEnds: number[] } // phaseEnds[k] = index frame terakhir fase k
```

- **Satuan navigasi = fase** (sesuai prototipe & SRS "next step"). Di dalam satu fase, action dianimasikan berurutan.
- `next` → mainkan action fase berikutnya, berhenti di akhir fase. `prev` → lompat (tanpa animasi mundur) ke akhir fase sebelumnya. Di fase terakhir, `next` tidak melakukan apa-apa (tidak loop).
- Pilih fase k → lompat ke akhir fase k−1 lalu mainkan fase k.
- `play` → maju otomatis fase demi fase dengan jeda 600 ms antar fase; berhenti di akhir fase terakhir. `replay` → ke fase 0 lalu play.
- `speed` ∈ {0.5, 0.75, 1, 1.25, 1.5, 2}; durasi efektif = `durationMs / speed`; **perubahan speed berlaku seketika**, termasuk saat play.
- `prefers-reduced-motion` → durasi 0 (lompat langsung ke state).

### 4.5 Proyeksi Spectator vs Secret

- **Secret:** semua kartu nyata dirender. Unit `lifted.asOne` digambar sedikit tergeser (offset 6 px per kartu) sehingga terlihat ada >1 kartu. Kartu dengan `perceivedAs ≠ label` diberi outline putus-putus emas + badge "Spectator thinks: A♥". Kartu `jogged` terlihat menonjol.
- **Spectator:** unit `lifted.asOne` digambar sebagai **satu** kartu; kartu face-down menampilkan punggung; label/tooltip memakai `perceivedAs ?? label`; tidak ada badge atau offset rahasia.

Teks panel "current step" dan breakdown: Secret → `phase.explanation`; Spectator → `phase.spectatorText`.

**Routine seed "Standard":**

| # | Fase (`summary`) | Actions | Spectator melihat | Yang sebenarnya |
|---|---|---|---|---|
| 1 | Preparation (Set the scene) | `setupDeck{named:[X, AH], restCount:50}` | Kartu pilihan diletakkan di atas deck | X di atas, A♥ kedua dari atas |
| 2 | Double Lift (Secret handling) | `doubleLift{2}`, `turnOver{lifted}` | A♥ ditunjukkan di atas | Dua kartu diangkat sebagai satu; wajah A♥ terlihat |
| 3 | Insert (Apparently lost) | `turnOver{lifted}`, `replace`, `takeTop{1}`, `insert{middle}` | A♥ dimasukkan ke tengah | X (dipersepsikan A♥) yang masuk; A♥ tetap di atas |
| 4 | Snap (Magical beat) | `snap` | Jentikan — momen ajaib | Tidak ada gerakan rahasia; deck dirapikan |
| 5 | Fan Reveal (Final display) | `revealTop`, `spread` | A♥ kembali di atas | A♥ memang tidak pernah pergi |

### 4.6 Layout

`layout()` menghasilkan node dalam sistem koordinat tetap **360 × 300**. SVG memakai `viewBox="0 0 360 300"` sehingga skala mengikuti lebar kontainer (memperbaiki overflow mobile prototipe). `IRenderNode = { id, kind: "card" | "deckBlock" | "fanCard", zone: "deck" | "lifted" | "hand" | "buried" | "fan" | "block", x, y, rotation, z, face, label, perceivedLabel: string | null, highlight: "none" | "perceived" | "jogged" }`. Nilai posisi dikunci oleh test snapshot. When the deck is spread, the fan consists of 9 anonymous `fanCard` nodes followed by the named deck cards (top card last); buried cards stay visible inside the fan at the middle position.

---

## 5. Backend (`apps/api`)

```text
apps/api/src/
├── index.ts            Hono app, onError, CORS (origin Vite), export type AppType
├── routes/             tricks.ts, routines.ts, notes.ts
├── services/           trickService.ts, routineService.ts, noteService.ts, currentUser.ts
└── db/                 client.ts, schema.ts, seed.ts, migrations/ (drizzle-kit)
```

Validasi request dengan `@hono/zod-validator` memakai schema dari `packages/shared`. Response mengikuti schema shared yang sama. Route → service → Drizzle (SRS §28).

### Endpoint MVP1

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/tricks` | — | `ITrickSummary[]` (dipakai untuk redirect `/`) |
| GET | `/tricks/:id` | — | `ITrickDetail`: trick + props + routines (ringkas) + `defaultRoutineId` + notes trick |
| PATCH | `/tricks/:id` | `{ isFavorite: boolean }` | `ITrickDetail` |
| GET | `/routines/:id` | — | `IRoutineDetail`: routine + tips + phases (dengan actions, techniques, notes fase) |
| POST | `/notes` | `{ body, trickId? \| phaseId? … }` (tepat satu target) | `INote` |
| PATCH | `/notes/:id` | `{ body }` | `INote` |
| DELETE | `/notes/:id` | — | `204` |

Semua query di-scope ke `getCurrentUserId()`. Error: `{ error: { code, message } }` dengan status 400 (validasi), 404 (tidak ditemukan / bukan milik user), 500 (lainnya, pesan generik). Env: `DATABASE_URL`, `PORT` (default 3001), `WEB_ORIGIN`; disediakan `.env.example`. Vite dev server mem-proxy `/api` → API.

---

## 6. Frontend (`apps/web`) — Konvensi Hybrid

```text
apps/web/src/
├── api/          client.ts (satu-satunya instance hc<AppType>), trickAPI.ts, routineAPI.ts, noteAPI.ts
├── business/     trickBusiness.ts (doGetTrick, doToggleFavorite), routineBusiness.ts, noteBusiness.ts
├── components/   PascalCase/PascalCase.tsx — Visualizer, SceneSvg, PlaybackControls, PhaseStrip,
│                 PhaseBreakdown, TrickHero, DetailPanel, TechniqueList, NotesPanel, Sidebar, TopBar,
│                 LanguageSwitch
├── contents/     TrickDetail/TrickDetail.tsx, Layout/AppLayout.tsx
├── constants/    routes.ts, playback.ts (SPEEDS, PHASE_GAP_MS)
├── i18n/         i18n.ts (react-i18next), locales/en.json, locales/id.json
├── routes/       router.tsx
├── store/        useTrick.ts, useRoutine.ts, usePlayer.ts
├── types/        *.types.ts — hanya tipe khusus UI; tipe domain di-import dari @sleightbook/shared
├── utils/        toast.ts (wrapper Toast.* di atas sonner), format.ts
├── App.tsx, main.tsx, index.css
```

Aturan yang diambil dari CONVENTIONS: named export, props interface di atas komponen, urutan isi komponen, `import type`, prefix `I`/`T`, handler `handle…`, fungsi async business `do…`, konstanta `SCREAMING_SNAKE_CASE`, komponen tidak memanggil `api/` langsung, store diakses di business via `.getState()`, error ditangani di business dan ditampilkan via `Toast.*`.

**State:**

- `useTrick` / `useRoutine` — data dari API + `isLoading` + error.
- `usePlayer` — `{ timeline, phaseIndex, frameIndex, isPlaying, speed, view: "secret" | "spectator", showExplanations }` + aksi `next/prev/goToPhase/play/pause/replay/setSpeed/setView`. Timer playback dikelola oleh hook `useTimelinePlayback` di komponen Visualizer dan **dibersihkan saat unmount** (memperbaiki bug timer bocor di prototipe).

**Styling:** Tailwind v4. Palet prototipe dijadikan token `@theme` di `index.css` (`--color-bg`, `--color-panel`, `--color-line`, `--color-gold`, `--color-gold-2`, `--color-muted`, …). Komponen hanya memakai token — tidak ada hex hardcode (terjemahan aturan "jangan hardcode warna" CONVENTIONS). Animasi kartu: `motion.g` dengan `animate={{ x, y, rotate }}` dan `transition.duration` dari timeline.

**Halaman TrickDetail (satu-satunya halaman MVP1):** Hero (nama, kategori, deskripsi, difficulty, durasi, props, Start Visualizer, Favorite) → Visualizer (SVG scene, kontrol, toggle Spectator/Secret, toggle penjelasan, badge `STEP n / N`) → PhaseStrip → PhaseBreakdown (tersinkron; fase aktif ter-highlight) → panel samping: Trick details, Techniques untuk fase aktif, Props, Pro tips, Notes (trick + fase aktif). Route: `/` → redirect ke trick pertama; `/tricks/:id`. Tabs, AI card, Variations, dan item sidebar yang belum ada **tidak dirender**.

**Aksesibilitas (NFR-004):** semua kontrol berupa `<button>`/`<input>` asli; tombol ikon punya `aria-label`; favorite & toggle memakai `aria-pressed`; ring fokus emas via `focus-visible`; ukuran teks minimum 12 px; kontras teks ≥ 4.5:1 (token warna muted disesuaikan dari prototipe); shortcut keyboard visualizer: `Space` play/pause, `←`/`→` prev/next, `S` toggle view — aktif hanya saat fokus tidak di input.

**i18n:** default `en`, pilihan `id`, disimpan di `localStorage` (dibungkus try/catch). Semua string UI lewat `t()`.

---

## 7. Testing & Tooling

| Lapisan | Alat | Cakupan wajib |
|---|---|---|
| `packages/shared` | bun test | `ActionSchema` menerima semua action valid & menolak type/params salah; schema note menolak 0 atau >1 target |
| `packages/engine` | bun test | Setiap reducer; error codes; `buildTimeline` untuk routine seed (frame count, `phaseEnds`); `project` spectator vs secret pada frame Double Lift & Insert; snapshot `layout` |
| `apps/api` | bun test + Postgres test (`sleightbook_test`) | Tiap endpoint happy path + 400 + 404; constraint notes; seed lolos `validateRoutine` |
| `apps/web` | bun test | `usePlayer`: next/prev/goToPhase/stop di akhir/speed berubah saat play |
| E2E | Playwright | Buka app → redirect ke Ambitious Card; play sampai selesai; next/prev; klik fase 3 → breakdown ter-highlight; toggle Secret/Spectator mengubah jumlah kartu terangkat di fase 2; favorite bertahan setelah reload; tambah & edit note fase bertahan setelah reload; ganti bahasa ke `id` |

Script root: `dev` (web; API menyusul di Part 2), `db:up`, `db:down`, `test`, `test:e2e`, `lint` (Biome), `typecheck` (tsc -b), `check` (lint + typecheck + test). Versi dependency: rilis stabil terbaru saat instalasi.

Prasyarat mesin: Bun, Docker Desktop.

---

## 8. Deviasi dari Dokumen Sumber

| Sumber | Aturan asli | Di MVP1 | Alasan |
|---|---|---|---|
| CONVENTIONS | MUI + `sx`, CSS Modules | Tailwind v4 + token `@theme` | D1 — estetika prototipe |
| CONVENTIONS | axios + `api.ts` | Hono RPC `hc` di `api/client.ts` | Tipe end-to-end dari backend |
| CONVENTIONS | notistack | sonner di balik wrapper `Toast.*` | Ringan, tanpa MUI |
| CONVENTIONS | folder `constans/` | `constants/` | Memperbaiki salah ketik |
| CONVENTIONS | semua tipe di `src/types` | tipe domain di `packages/shared` | Dipakai bersama web & api |
| CONVENTIONS | ProtectedRoute / role | tidak dipakai | D2 — belum ada auth |
| SRS §7 | `favorite` di Trick | tetap di `tricks.isFavorite` | — (sesuai) |
| SRS §27 | `GET /techniques`, `/gimmicks`, `/practice`, `/ai/*` | belum dibuat | Di luar scope MVP1 |
| SRS §31 | Navigasi lengkap | hanya item yang berfungsi | Tidak ada UI mati |
| Spec §4.6 (awal) | IRenderNode hanya kind card/deckBlock | + kind fanCard, field zone & perceivedLabel | Dibutuhkan renderer (badge Spectator thinks) & E2E (data-zone) |
| Spec §7 | typecheck via tsc -b | tsc --noEmit per package via bun --filter | Setara; tanpa project references |
| D3 / §5 | Full-stack tipis (Hono + Postgres) | **Part 2 (API + DB) ditunda** oleh user 2026-09-26; web memakai data lokal (localStorage, seed Ambitious Card) di balik `api/*API.ts` dengan signature yang sama | Fokus ke app dulu; saat API siap hanya isi `api/*API.ts` yang diganti |

---

## 9. Kriteria Selesai MVP1

1. `bun run check` dan `bun run test:e2e` lulus di mesin bersih (mode data lokal selama Part 2 ditunda — lihat §8).
2. Seorang user bisa membuka Ambitious Card, memutar kelima fase, melompat ke fase mana pun, dan membandingkan Spectator vs Secret — lalu merekonstruksi metodenya (SRS §36).
3. Favorite dan notes tersimpan (localStorage selama Part 2 ditunda; Postgres setelah Part 2) dan bertahan setelah reload.
4. Tidak ada elemen UI yang tampil tanpa fungsi.
5. Tidak ada commit git (D8) — semua perubahan tetap di working tree.
