# Sleightbook — Desain MVP Phase 2 (Library, Techniques, Gimmicks, Variasi, Triumph)

**Tanggal:** 2026-09-26
**Status:** Draft — menunggu review user
**Dasar:** [MVP1 design](2026-09-26-sleightbook-mvp1-design.md) (tetap berlaku kecuali diubah di sini), [SRS](../../reference/Sleightbook-SRS.md) §8, §14–16, §20, §25, §32

---

## 0. Keputusan

| # | Topik | Keputusan |
|---|---|---|
| P1 | Isi Library | 6 trick dari prototipe: Ambitious Card, Triumph, Oil & Water, Coin Matrix, Thought Card, Rising Card |
| P2 | Visualisasi | **Bertahap** — Ambitious Card (Standard) + **Triumph** punya visualizer; routine lain teks saja ("visualisasi belum tersedia") |
| P3 | Variasi | **Lihat & pilih** routine per trick; tidak ada editor |
| P4 | Engine | **Pendekatan A** — scene per keluarga trick: `deck` (MVP1) + `packets` (baru, Triumph) |
| P5 | Search | Client-side (di lapisan data), case-insensitive, atas nama/deskripsi/kategori trick, nama teknik, nama item, isi notes |
| P6 | Navigasi | Sidebar: Library, Favorites, Techniques, Gimmicks & Props. Recently Practiced → Phase 3 |
| P7 | Data | Tetap lokal (Part 2 masih ditunda). localStorage **v1 → v2** dengan migrasi favorit & notes |
| P8 | Git | Tetap tanpa commit sampai user bilang repo siap |

## 1. Scope

**Masuk:** halaman Library (grid, search, filter kategori, favorit), halaman Favorites, Technique Library (daftar + detail + "dipakai di"), Gimmicks & Props (daftar + detail + "dipakai di"), pemilih routine di halaman trick, visualizer Triumph, notes pada teknik & item, search box di top bar.

**Tidak masuk:** editor trick/routine, practice mode/history, recently practiced, AI, backend. Aturan MVP1 tetap: tidak ada UI mati.

---

## 2. Konten (fixture)

Fixture baru `packages/shared/src/fixtures/library.ts` → `LIBRARY_FIXTURE`. Teknik & item adalah **katalog bersama** (SRS Prinsip 4: teknik reusable), direferensikan per nama dari routine. `ambitiousCard.ts` (MVP1) **tidak diubah**; library memakai ulang fasenya.

```ts
interface ILibraryFixture {
  techniques: IFixtureTechnique[];            // katalog
  items: IFixtureItem[];                       // katalog
  tricks: {
    trick: ITrickFixture["trick"];
    note: string | null;                       // note trick awal
    routines: {
      name: string; description: string; tips: string[];
      isDefault: boolean;
      items: string[];                         // nama item dari katalog
      phases: IFixturePhase[];                 // actions [] di semua fase = routine teks saja
    }[];
  }[];
}
```

| Trick | Kategori / Level | Routine (★ = default, 🎬 = visual) |
|---|---|---|
| Ambitious Card | Card / Intermediate | ★🎬 Standard (fase MVP1) · Elmsley Version · Top Change Version |
| Triumph | Card / Intermediate | ★🎬 Vernon (§3.4) |
| Oil & Water | Card / Advanced | ★ Standard (Elmsley count) |
| Coin Matrix | Coin / Advanced | ★ Standard (4 koin, 4 kartu) |
| Thought Card | Mentalism / Intermediate | ★ Classic Force & Prediction |
| Rising Card | Gimmick / Intermediate | ★ Thread Rise |

Katalog teknik: Double Lift, Card Insertion, Snap, Spread, Elmsley Count, Top Change, Riffle Shuffle, Strip-Out Shuffle, Packet Turnover, Classic Force, Coin Retention Vanish, Thread Rise.
Katalog item: Deck of cards (prop), Four coins (prop), Four playing cards (prop), Close-up mat (prop), Prediction envelope (prop), Invisible thread (gimmick).

Isi teks fase ditulis di rencana implementasi; **user memverifikasi metode** di review (terutama Triumph, §3.4). Aturan fixture (dites): tiap routine punya ≥ 1 fase; routine **visual** = semua fase punya ≥ 1 action dan lolos `validateRoutine`; routine **teks** = semua fase tanpa action; setiap nama teknik/item ada di katalog; tepat satu `isDefault` per trick.

---

## 3. Engine — scene `packets` untuk Triumph

### 3.1 Perubahan tipe (kecil, kompatibel)

- `ISceneState` MVP1 mendapat discriminator `kind: "deck"` (nama tetap, perilaku tetap). Scene baru `IPacketScene` dengan `kind: "packets"`. `TScene = ISceneState | IPacketScene`.
- `IFrame.state`, `ITimeline.initial`, `stateAt`, `applyAction`, `project` bekerja atas `TScene`; `project`/`layout` dispatch per `kind`.
- Semua test MVP1 engine tetap lulus **tanpa diubah** (kecuali penambahan `kind` bila sebuah test membandingkan seluruh objek scene).
- Error baru: `WRONG_SCENE` — action milik keluarga lain (mis. `doubleLift` di scene packets).

### 3.2 Model

```ts
type TPacketId = "main" | "left" | "right";

interface IPacket {
  id: TPacketId;
  count: number;          // total kartu di packet, termasuk kartu bernama
  face: TFace;            // orientasi mayoritas kartu packet
  namedIds: string[];     // kartu bernama di packet (index 0 = paling atas)
}

interface IPacketScene {
  kind: "packets";
  cards: Record<string, ICard>;   // ICard MVP1 (face per kartu bernama)
  packets: IPacket[];             // urutan tumpukan: index 0 = paling atas / paling kiri di meja
  stacked: boolean;               // true = packets ditumpuk jadi satu deck di tengah
  perceivedMixed: boolean;        // penonton yakin deck tercampur face-up/face-down
  spread: boolean;
  beat: boolean;
}
```

### 3.3 Action baru (ditambahkan ke `ActionSchema`)

| `type` | `params` | Efek |
|---|---|---|
| `setupPackets` | `{ selection: {label}, count: 20..52 }` | Satu packet `main` face down berisi `count` kartu; kartu pilihan `c1` di dalamnya (face down) |
| `cutHalves` | `{}` | `main` → `left` (atas, berisi kartu bernama) & `right`, masing-masing ½ `count` (dibulatkan), `stacked=false` |
| `turnPacket` | `{ packet: "left"\|"right", keepTop: boolean, covert: boolean }` | Packet dibalik: `face` berganti, urutan `namedIds` dibalik, face tiap kartu bernama berganti — **kecuali** bila `keepTop` dan kartu itu paling atas (tetap). `covert=true` → persepsi penonton tidak berubah |
| `riffle` | `{ mode: "stripOut" }` | Packets ditumpuk jadi satu (`stacked=true`, urutan: `right` di atas `left`), **tetap utuh** secara nyata; `perceivedMixed=true` |
| `spreadReveal` | `{}` | `spread=true`, `perceivedMixed=false` (penonton kini melihat kebenaran) |
| `snap` | `{}` | (dipakai bersama) `beat=true` satu frame |

`turnPacket` dan `riffle` dengan `stacked=true` merujuk packet berdasarkan id yang sama; semua action lain milik scene `deck` → `WRONG_SCENE`.

### 3.4 Routine Triumph "Vernon" (disederhanakan — **perlu verifikasi user**)

| # | Fase (summary) | Actions | Penonton melihat | Sebenarnya |
|---|---|---|---|---|
| 1 | Selection (Card chosen) | `setupPackets{selection:{label:"4S"}, count:52}` | Kartu dipilih lalu hilang di deck | 4♠ diam-diam dikontrol ke paling atas deck |
| 2 | Cut & Turn (Half face up) | `cutHalves`, `turnPacket{left, keepTop:true, covert:false}` | Deck dipotong dua, satu separuh dibalik face up | Separuh berisi 4♠ dibalik **kecuali** 4♠ sendiri — kini 4♠ satu-satunya kartu face down di separuh face up |
| 3 | The Shuffle (Apparently mixed) | `riffle{mode:"stripOut"}` | Separuh face up & face down dishuffle jadi campur | Strip-out shuffle: kedua separuh hanya *tampak* tercampur, sebenarnya tetap utuh bertumpuk |
| 4 | Secret Correction (Nothing to see) | `turnPacket{left, keepTop:false, covert:true}` | Deck dirapikan, tidak terjadi apa-apa | Saat merapikan, separuh face up dibalik diam-diam → semua kartu face down, kecuali 4♠ yang kini face up |
| 5 | Triumph (Order restored) | `snap`, `spreadReveal` | Jentikan — semua kartu kembali menghadap sama, kecuali kartu pilihan yang face up | 4♠ memang satu-satunya kartu terbalik sejak fase 2 |

Aturan tambahan untuk `turnPacket` dengan `keepTop:true`: kartu bernama paling atas tetap di posisinya (index 0) dengan face tidak berubah; sisa packet dibalik. `cutHalves`: `left` = ⌈count/2⌉ dan menerima semua kartu bernama. `riffle stripOut`: urutan tumpukan `right` di atas `left`. Engine test mengunci: setelah fase 5, `c1.face = "up"`, semua packet `face = "down"`, `perceivedMixed = false`, `spread = true`.

**User wajib memverifikasi urutan ini** (versi Triumph yang ia bawakan bisa berbeda); koreksi cukup di tabel ini sebelum eksekusi.

### 3.5 Proyeksi & layout packets

- **Secret:** tiap packet dirender sebagai blok (`packetBlock`, face sesuai `face`), kartu bernama ditampilkan di posisi sebenarnya dengan face aslinya; kartu yang berlawanan arah dengan packet-nya diberi highlight `"reversed"`.
- **Spectator:** kartu bernama di dalam packet tidak terlihat terpisah (mengikuti face packet) kecuali saat spread; saat `stacked && perceivedMixed` deck dirender sebagai satu blok **belang** (`mixedBlock`).
- **Spread:** fan (pakai aturan fan MVP1) berisi kartu anonim face down + kartu pilihan face up di tengah.
- `IRenderNode.kind` bertambah `"packetBlock" | "mixedBlock"`, `zone` bertambah `"packet"`, `highlight` bertambah `"reversed"`. Stage tetap 360×300; koordinat dikunci test di rencana.

---

## 4. Data lokal v2

Bentuk ternormalisasi (meniru tabel Part 2 agar migrasi ke API nanti mudah):

```ts
interface ILocalDatabaseV2 {
  version: 2;
  tricks: ITrickRecord[];      // tanpa notes/items/routines ter-embed
  routines: IRoutineRecord[];  // trickId, isDefault, position, itemIds[], phases (dengan actions & techniqueIds)
  techniques: ITechnique[];
  items: IItem[];
  notes: INote[];              // semua target: trickId | phaseId | techniqueId | itemId
}
```

- DTO (`ITrickDetail`, `IRoutineDetail`, dll.) **dirakit** di lapisan `api/` dari record — sama seperti server nanti.
- **Migrasi v1 → v2** saat `load()`: bila key v1 ada dan valid → seed v2, lalu bawa `isFavorite` Ambitious Card (via slug), note trick (via slug), note fase (via routine default + posisi fase). Setelah sukses, v1 disalin ke `sleightbook.db.v1.migrated` (backup) dan key v1 dihapus. Data v2 rusak → perilaku backup F2 MVP1 (backup + reseed).
- ID baru pada v2 → URL lama `/tricks/<id-v1>` menampilkan halaman Not Found yang sudah ada.
- Notes kini mendukung `techniqueId` & `itemId`; `routineId` tetap `NOT_SUPPORTED` (UI tidak memakainya).

---

## 5. Kontrak data (shared schemas baru/berubah)

```ts
// trick.ts
TrickCardSchema = TrickSummarySchema.extend({ description, durationMin, durationMax,
  phaseCount (routine default), techniqueNames: string[] (routine default, urut nama),
  hasVisualization: boolean (routine default) })
LibraryQuerySchema = z.object({ q: z.string().default(""), category: z.enum(["all", ...CATEGORIES]).default("all"),
  favoritesOnly: z.boolean().default(false) })
RoutineSummarySchema += hasVisualization: boolean

// technique.ts (baru)
TechniqueSummarySchema = { id, name, category, difficulty, usageCount }
UsageSchema = { trickId, trickName, routineId, routineName, phaseNames: string[] }
TechniqueDetailSchema = TechniqueSchema.extend({ usedIn: UsageSchema[], notes: NoteSchema[] })

// item.ts (baru)
ItemSummarySchema = ItemSchema.extend({ usageCount })
ItemDetailSchema = ItemSchema.extend({ usedIn: UsageSchema[] (phaseNames: []), notes: NoteSchema[] })
```

Search: token query dipecah per spasi; sebuah trick cocok bila **setiap** token muncul di gabungan teks (nama, deskripsi, label kategori EN, nama teknik & item semua routine, isi notes trick + fase). Hasil diurutkan nama.

**Fungsi `api/`** (async, signature yang sama nanti dipakai HTTP):
`searchTricks(query)`, `getTrick(id)`, `patchTrickFavorite(id, v)`, `getRoutine(id)`, `getTechniques()`, `getTechnique(id)`, `getItems()`, `getItem(id)`, `postNote`, `patchNote`, `deleteNote`.

---

## 6. Frontend

### 6.1 Rute

| Path | Konten |
|---|---|
| `/` | **Library** (menggantikan redirect MVP1) — query di URL: `?q=&category=` |
| `/favorites` | Library dengan `favoritesOnly=true` (komponen sama) |
| `/tricks/:id?routine=<routineId>` | Trick Detail; tanpa `routine` → routine default |
| `/techniques`, `/techniques/:id` | Technique Library & detail |
| `/items`, `/items/:id` | Gimmicks & Props & detail |

### 6.2 Halaman & komponen baru

- **Library:** judul + subjudul (prototipe), search input (label "Search tricks"), chip filter kategori (`aria-pressed`), jumlah hasil ("{{count}} tricks", plural i18next), grid `TrickCard` (ikon kategori, nama, meta "Card · Intermediate · 5 phases", maks 3 tag teknik, badge "Visual" bila `hasVisualization`, tombol bintang favorit `aria-pressed`, seluruh kartu adalah link ke detail). Empty state + tombol "Clear filters".
- **TopBar:** search box global → navigasi ke `/?q=…`.
- **Sidebar:** nav Library / Favorites / Techniques / Gimmicks & Props (NavLink aktif). Daftar trick MVP1 dihapus dari sidebar.
- **Trick Detail:** `RoutineSwitcher` (daftar routine, `aria-pressed`, mengubah `?routine=`), badge "Default". Routine teks: panel "Visualization not available yet for this routine" menggantikan Visualizer; PhaseBreakdown & panel fase tetap bekerja. `TechniqueList` → setiap teknik link ke `/techniques/:id`; `ItemList` → link ke `/items/:id`. Props di hero diambil dari **routine yang dipilih**.
- **Technique Detail:** nama, kategori, level, deskripsi, tips, common mistakes, "Used in" (link ke trick + routine, beserta nama fase), NotesPanel (target `techniqueId`).
- **Item Detail:** nama, jenis, deskripsi, setup notes, "Used in", NotesPanel (target `itemId`).

### 6.3 Player untuk routine teks

`usePlayerStore` mendapat `phaseCount`; `loadStatic(phaseCount)` menyetel `timeline=null` dan navigasi fase (goToPhase/next/prev) bekerja tanpa animasi. `load(timeline)` menyetel `phaseCount = timeline.phaseEnds.length`. Semantik §4.4 MVP1 untuk routine visual tidak berubah.

### 6.4 i18n

Semua string baru EN + ID (paritas dites). Nama/konten trick tetap bahasa Inggris (konten domain).

---

## 7. Testing

| Lapisan | Cakupan wajib |
|---|---|
| shared | `ActionSchema` action packets baru (valid/invalid); schema baru; aturan fixture library (§2) |
| engine | reducer packets tiap action + `WRONG_SCENE`; timeline Triumph (frame count, phaseEnds); proyeksi Spectator (mixedBlock) vs Secret (dua packet + `reversed`); layout Triumph dikunci; semua test MVP1 tetap lulus |
| web unit | localDb v2: seed, search (token, kategori, favorit, notes), assembly DTO, usedIn, migrasi v1→v2 (favorit & notes terbawa, backup v1), notes teknik/item; usePlayer `loadStatic`; format/plural |
| E2E | Library: 6 kartu, search "elmsley" → Ambitious Card + Oil & Water, filter Coin → Coin Matrix, favorit dari kartu tampil di /favorites; Trick: ganti routine ke "Elmsley Version" → panel tanpa visualisasi, kembali ke Standard → visualizer; Technique: dari fase Double Lift klik teknik → detail menampilkan "Used in Ambitious Card"; Triumph: Secret vs Spectator pada fase shuffle (mixedBlock hanya di Spectator); **8 test MVP1 tetap lulus** (disesuaikan: `/` kini Library, buka Ambitious Card dari kartu) |

---

## 8. Deviasi

| Sumber | Asli | Phase 2 | Alasan |
|---|---|---|---|
| MVP1 §6 | `/` redirect ke trick pertama | `/` = Library | SRS §8.1 Library adalah landing page |
| MVP1 §6 | Sidebar berisi daftar trick | Sidebar = navigasi seksi | SRS §31 |
| MVP1 §4.1 | `ISceneState` tanpa `kind` | + `kind: "deck"`, `TScene` union | Pendekatan A |
| MVP1 data lokal v1 | embed notes di DTO | v2 ternormalisasi + migrasi | Siap untuk API Part 2 |
| SRS §20 | create/duplicate/compare variasi | lihat & pilih saja | P3 |

## 9. Kriteria selesai

1. `bun run check` & `bun run test:e2e` hijau (termasuk test MVP1).
2. User bisa menemukan trick tanpa ingat namanya (search teknik/notes), membuka variasi, menavigasi routine ↔ teknik ↔ item, dan menonton Triumph dalam Spectator vs Secret.
3. Favorit & notes MVP1 user terbawa ke v2.
4. Tidak ada UI mati; tidak ada commit sampai user mengizinkan.
