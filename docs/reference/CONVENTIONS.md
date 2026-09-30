# Project Conventions

Dokumen ini adalah acuan resmi konvensi kode yang berlaku di project ini. Semua kontributor wajib mengikuti aturan di bawah ini agar kode tetap konsisten, rapi, dan mudah dimaintain.

---

## Table of Contents

1. [Struktur Folder](#1-struktur-folder)
2. [Penamaan File & Folder](#2-penamaan-file--folder)
3. [TypeScript](#3-typescript)
4. [Komponen React](#4-komponen-react)
5. [Styling](#5-styling)
6. [State Management (Zustand)](#6-state-management-zustand)
7. [Arsitektur Layer](#7-arsitektur-layer)
8. [Import Order](#8-import-order)
9. [Naming Conventions](#9-naming-conventions)
10. [Pola Umum (Common Patterns)](#10-pola-umum-common-patterns)
11. [DO & DON'T](#11-do--dont)

---

## 1. Struktur Folder

```
src/
├── api/           # Raw HTTP calls (axios). Tidak ada logika bisnis di sini.
├── business/      # Business logic. Mengorkestrasi API + store + navigasi.
├── components/    # Reusable UI components (bukan full-page).
├── contents/      # Page-level components (full view, bisa terdiri dari banyak komponen).
│   ├── Dashboard/ # Halaman-halaman dalam dashboard.
│   └── Layout/    # Wrapper layout global.
├── constans/      # Konstanta dan enum (API routes, role values, dsb).
├── routes/        # Konfigurasi React Router.
├── store/         # Zustand stores.
├── types/         # Semua TypeScript interface dan type alias.
├── utils/         # Fungsi helper murni (tidak ada side effect).
├── App.tsx
├── main.tsx
└── index.css
```

**Aturan:**
- Satu folder = satu tanggung jawab. Jangan campur API calls dengan komponen.
- `components/` untuk komponen reusable. `contents/` untuk halaman utuh.
- Jangan taruh logika fetch data langsung di dalam komponen — delegasikan ke `business/`.

---

## 2. Penamaan File & Folder

| Tipe | Format | Contoh |
|------|--------|--------|
| Komponen | `PascalCase/PascalCase.tsx` | `CardUser/CardUser.tsx` |
| Halaman (contents) | `PascalCase/PascalCase.tsx` | `Dashboard/DashboardMain.tsx` |
| CSS Module | `NamaKomponen.module.css` | `Login.module.css` |
| API file | `camelCase.ts` | `loginAPI.ts`, `dashboardAPI.ts` |
| Business logic | `camelCase.ts` | `authBusiness.ts`, `userManagementBusiness.ts` |
| Zustand store | `useNama.ts` | `useUser.ts`, `useDashboard.ts` |
| Type definitions | `nama.types.ts` | `auth.types.ts`, `user.types.ts` |
| Konstanta | `camelCase.ts` | `routesAPI.ts`, `dataEnum.ts` |
| Utilities | `camelCase.ts` | `userMapper.ts` |

**Aturan:**
- Komponen selalu dalam folder tersendiri dengan nama yang sama. Tidak ada komponen langsung menggantung di root `components/`.
- Tidak ada `index.ts` barrel exports — import langsung dari path file-nya.

---

## 3. TypeScript

### Interface vs Type

Gunakan **`interface`** untuk bentuk objek/data:

```typescript
// ✅ Benar
export interface IUser {
  id: number;
  firstName: string;
  lastName: string;
}

// Interface bisa di-extend
export interface ICardProps extends IUser {
  onClick?: () => void;
}
```

Gunakan **`type`** untuk union types, mapped types, dan alias primitif:

```typescript
// ✅ Benar
export type TRole = "admin" | "moderator" | "user";
export type TGender = "male" | "female";
export type TUserRoles = {
  roles: TRole[];
};

// Utility types
export type IUserToken = Pick<ILoginResponse, "accessToken" | "refreshToken">;
```

### Prefix Naming

| Prefix | Digunakan untuk | Contoh |
|--------|----------------|--------|
| `I` | Interface | `IUser`, `ILoginForm`, `IDashboardStats` |
| `T` | Type alias | `TRole`, `TGender`, `TUserRoles` |

### Import Types

Selalu gunakan `import type` untuk tipe — tidak menambah bundle size:

```typescript
// ✅ Benar
import type { ILoginForm } from "../../types/auth.types";
import type { TRole } from "../../types/user.types";

// ❌ Salah
import { ILoginForm } from "../../types/auth.types";
```

### Type Definitions Location

Semua tipe data **wajib** disimpan di `src/types/` dengan suffix `.types.ts`. Jangan mendefinisikan interface di dalam file komponen kecuali untuk props komponen internal.

### Props Component

Untuk komponen yang diekspor, definisikan props sebagai interface terpisah di atas komponen:

```typescript
// ✅ Benar
interface DashboardSidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export const DashboardSidebar = ({ mobileOpen, onClose }: DashboardSidebarProps) => {
  // ...
};
```

Untuk sub-komponen internal (tidak diekspor), boleh inline:

```typescript
// ✅ Boleh — sub-komponen kecil, tidak diekspor
const SectionTitle = ({ title }: { title: string }) => (
  <Typography>{title}</Typography>
);
```

### TypeScript Config Rules

Config yang berlaku (`tsconfig.app.json`):
- `strict: true` — semua strict checks aktif
- `noUnusedLocals: true` — variabel yang tidak dipakai = error
- `noUnusedParameters: true` — parameter yang tidak dipakai = error
- `noFallthroughCasesInSwitch: true`

---

## 4. Komponen React

### Struktur Penulisan Komponen

Ikuti urutan ini secara konsisten:

```typescript
// 1. Import (lihat bagian Import Order)

// 2. Interface props (jika ada)
interface MyComponentProps {
  title: string;
  onAction: () => void;
}

// 3. Named export component (bukan default export)
export const MyComponent = ({ title, onAction }: MyComponentProps) => {
  // 4. Hooks (useState, useEffect, custom hooks, dsb)
  const navigate = useNavigate();
  const { data, isLoading } = useMyStore();
  const [open, setOpen] = useState(false);

  // 5. Event handlers
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const handleSubmit = () => { /* ... */ };

  // 6. Return JSX
  return (
    <Box>
      {/* content */}
    </Box>
  );
};

// 7. Sub-komponen (di bawah komponen utama)
const SubSection = ({ label }: { label: string }) => (
  <Typography>{label}</Typography>
);
```

### Export

Selalu gunakan **named export**, bukan default export:

```typescript
// ✅ Benar
export const LoginForm = () => { /* ... */ };

// ❌ Hindari
export default function LoginForm() { /* ... */ }
```

### Sub-komponen

Sub-komponen yang hanya dipakai di satu file didefinisikan di bagian **bawah** file sebagai `const` arrow function:

```typescript
const DetailRow = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <Stack direction="row" justifyContent="space-between">
    <Typography>{label}</Typography>
    <Typography>{value}</Typography>
  </Stack>
);
```

---

## 5. Styling

### Hierarki Styling

1. **MUI `sx` prop** — untuk komponen MUI dan logika styling dinamis/responsif
2. **CSS Modules** — untuk layout halaman utama (`*.module.css`)
3. **`index.css`** — hanya untuk reset global dan font

### MUI `sx` Prop

```typescript
// ✅ Responsif menggunakan breakpoint object
<Box sx={{ p: { xs: "12px", sm: "16px", md: "24px" } }}>

// ✅ Pseudo-class
<Card sx={{ "&:hover": { transform: "translateY(-4px)", boxShadow: 3 } }}>

// ✅ Conditional styling
<Chip sx={{ bgcolor: role === "admin" ? "secondary.main" : "primary.main" }} />

// ✅ Glassmorphism pattern (digunakan di card/modal)
<Box sx={{
  background: "rgba(255, 255, 255, 0.7)",
  backdropFilter: "blur(20px)",
  boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
}}>
```

### MUI Grid Responsif

Selalu gunakan `Grid` dari MUI dengan `size` prop:

```typescript
<Grid container spacing={3}>
  <Grid size={{ xs: 12, sm: 6, lg: 4, xl: 3 }}>
    <CardUser {...user} />
  </Grid>
</Grid>
```

### CSS Modules

Dipakai untuk layout level halaman, bukan untuk komponen kecil:

```css
/* Login.module.css */
.container {
  height: 100vh;
  width: 100%;
  display: flex;
}

@media (max-width: 968px) {
  .container {
    flex-direction: column;
  }
}
```

```typescript
import style from "./Login.module.css";

return <div className={style.container}>...</div>;
```

### Tema MUI

Konfigurasi tema ada di `main.tsx`. Warna primary dan secondary sudah didefinisikan — gunakan via `color="primary"` atau `sx={{ color: "primary.main" }}` bukan hardcode hex.

---

## 6. State Management (Zustand)

### Struktur Store

Setiap store mengikuti pola ini:

```typescript
// src/store/useNama.ts
import { create } from "zustand";
import type { IDataType } from "../types/data.types";

// 1. Definisikan interface store
interface INamaStore {
  data: IDataType | null;
  isLoading: boolean;
  setData: (data: IDataType) => void;
  setIsLoading: (isLoading: boolean) => void;
}

// 2. Export store hook
export const useNamaStore = create<INamaStore>((set) => ({
  data: null,
  isLoading: false,
  setData: (data) => set({ data }),
  setIsLoading: (isLoading) => set({ isLoading }),
}));
```

### Akses Store di Komponen

```typescript
// ✅ Destructure yang dibutuhkan saja
const { users, isLoading } = useUserStore();
```

### Akses Store di Business Logic

Di luar komponen (business logic), gunakan `.getState()`:

```typescript
// ✅ Benar — di dalam business logic, bukan komponen
export const doFetchData = async () => {
  const { setData, setIsLoading } = useNamaStore.getState();

  try {
    setIsLoading(true);
    const result = await fetchFromAPI();
    setData(result);
  } finally {
    setIsLoading(false);
  }
};
```

---

## 7. Arsitektur Layer

Project menggunakan **tiga layer** yang terpisah ketat:

```
Komponen → Business Logic → API Layer
```

### API Layer (`src/api/`)

- Hanya berisi raw HTTP calls menggunakan axios
- Tidak ada navigasi, toast, atau manipulasi state di sini
- Gunakan typed `AxiosResponse<T>`

```typescript
// loginAPI.ts
export const postLogin = async (data: ILoginForm) => {
  const response: AxiosResponse<ILoginResponse> = await api.post(LOGIN, data);
  return response;
};
```

### Business Logic Layer (`src/business/`)

- Mengorkestrasi: memanggil API, update store, tampilkan toast, navigasi
- Fungsi prefix `do` untuk operasi async: `doFetchDashboardData`, `doGetAllUsers`
- Error handling ada di layer ini

```typescript
// authBusiness.ts
export const login = async (navigate: NavigateFunction, data: ILoginForm) => {
  try {
    const response = await postLogin(data);
    setUserToken(response.data);
    Toast.SuccessToast({ title: "Login Successfully" });
    navigate("/dashboard");
  } catch (error) {
    handleLoginError(error);
  }
};
```

### Komponen Layer (`src/components/`, `src/contents/`)

- Hanya berisi UI dan event binding
- Tidak boleh memanggil `api` langsung — selalu lewat `business/`
- Fetch data dipicu via `useEffect` yang memanggil fungsi dari `business/`

```typescript
export const DashboardUser = () => {
  const { users, isLoading } = useUserStore();

  useEffect(() => {
    doGetAllUsers(); // dari business layer
  }, []);

  return <Grid>...</Grid>;
};
```

### Axios Instance

Satu instance terpusat di `src/api/api.ts` dengan interceptor untuk auth token. Jangan buat `axios.create()` baru di tempat lain.

---

## 8. Import Order

Urutkan import dalam kelompok berikut, pisahkan dengan baris kosong:

```typescript
// 1. React dan hooks React
import { useState, useEffect } from "react";

// 2. Library eksternal (MUI components, icons, dll)
import { Box, Stack, Typography, Grid } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

// 3. Type imports
import type { ILoginForm } from "../../types/auth.types";

// 4. Third-party hooks (react-hook-form, react-router, dll)
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";

// 5. Internal: store
import { useUserStore } from "../../store/useUser";

// 6. Internal: business logic
import { login } from "../../business/authBusiness";

// 7. Internal: komponen
import { CardUser } from "../../components/CardUser/CardUser";

// 8. CSS Modules
import style from "./Login.module.css";
```

---

## 9. Naming Conventions

### Fungsi & Variables

| Tipe | Format | Contoh |
|------|--------|--------|
| Event handler | `handle + Domain + Action` | `handleFormSubmit`, `handleDrawerToggle`, `handleClickShowPassword` |
| Boolean state | `is/has/show + Noun` | `isLoading`, `mobileOpen`, `showPassword` |
| Async business fn | `do + Verb + Noun` | `doGetAllUsers`, `doFetchDashboardData` |
| Constants | `SCREAMING_SNAKE_CASE` | `SIDEBAR_WIDTH`, `BASE_URL` |
| API endpoint const | `SCREAMING_SNAKE_CASE` | `LOGIN`, `AUTH_ME`, `USERS` |
| Enum-like object | `PascalCase` (object) + `SCREAMING_SNAKE_CASE` (keys) | `UserRole.ADMIN` |

### Contoh Event Handlers

```typescript
// ✅ Konsisten dengan pola handle + Domain + Action
const handleClickShowPassword = () => setShowPassword((show) => !show);
const handleFormSubmit = handleSubmit((data) => login(navigate, data));
const handleDrawerToggle = () => setMobileOpen((prev) => !prev);
const handleOpen = () => setOpen(true);
const handleClose = () => setOpen(false);
```

### Konstanta

```typescript
// src/constans/routesAPI.ts
export const LOGIN = "/auth/login";
export const AUTH_ME = "/auth/me";
export const USERS = "/users";

// src/constans/dataEnum.ts
export const UserRole = {
  ADMIN: "admin",
  MODERATOR: "moderator",
  USER: "user",
} as const;
```

---

## 10. Pola Umum (Common Patterns)

### Loading State

```typescript
const { users, isLoading } = useUserStore();

if (isLoading) {
  return (
    <Grid container spacing={3}>
      {Array.from({ length: 6 }).map((_, index) => (
        <Grid key={index} size={{ xs: 12, sm: 6, lg: 4 }}>
          <Skeleton variant="rectangular" height={200} />
        </Grid>
      ))}
    </Grid>
  );
}
```

### Role-Based Rendering

```typescript
// Conditional render berdasarkan role
{userRole === "admin" && (
  <Link to="/dashboard/user-manager">
    <Button>User Manager</Button>
  </Link>
)}
```

### Protected Route

```typescript
// src/routes/ProtectedRoute.tsx
export const ProtectedRoute = ({ roles }: TUserRoles) => {
  const userToken = localStorage.getItem("token");
  const userRole = localStorage.getItem("role") as TRole | null;

  if (!userToken || !userRole) return <Navigate to="/login" replace />;
  if (!roles.includes(userRole)) return <Navigate to="/unauthorized" replace />;

  return <Outlet />;
};

// Penggunaan di routes
{
  element: <ProtectedRoute roles={["admin"]} />,
  children: [{ path: "user-manager", element: <DashboardUser /> }],
}
```

### Toast Notification

```typescript
// Selalu via wrapper Toast, bukan enqueueSnackbar langsung
Toast.SuccessToast({ title: "Data berhasil disimpan" });
Toast.ErrorToast({ title: "Gagal", description: "Cek koneksi internet Anda" });
Toast.InfoToast({ title: "Info" });
Toast.WarningToast({ title: "Peringatan" });
```

### Form dengan React Hook Form

```typescript
const { register, handleSubmit } = useForm<IFormType>();

const handleFormSubmit = handleSubmit((data: IFormType) => {
  doSubmitForm(data);
});

return (
  <form onSubmit={handleFormSubmit}>
    <TextField {...register("fieldName")} label="Label" />
    <Button type="submit">Submit</Button>
  </form>
);
```

### Spread Props ke Komponen

```typescript
// Ketika tipe props identik dengan tipe data
export type ICardProps = IUser; // atau extends IUser

// Penggunaan — spread langsung
{users.map((user) => (
  <CardUser key={user.id} {...user} />
))}
```

### Error Handling di Business Logic

```typescript
const handleError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) Toast.ErrorToast({ title: "Unauthorized" });
    else if (status === 404) Toast.ErrorToast({ title: "Not Found" });
    else Toast.ErrorToast({ title: "Terjadi kesalahan" });
  }
};
```

---

## 11. DO & DON'T

### DO ✅

- Gunakan named export untuk semua komponen
- Definisikan semua tipe di `src/types/*.types.ts`
- Prefix interface dengan `I`, type alias dengan `T`
- Gunakan `import type` untuk import tipe
- Pisahkan logika fetch data ke `business/` layer
- Gunakan `Toast.*` untuk semua notifikasi
- Gunakan MUI `sx` prop untuk styling dinamis
- Gunakan breakpoint MUI untuk responsivitas (`xs`, `sm`, `md`, `lg`, `xl`)
- Tulis `useEffect` di komponen, tapi panggil fungsi dari `business/`
- Akses store di luar komponen via `.getState()`

### DON'T ❌

- Jangan gunakan `default export` untuk komponen
- Jangan panggil `api.*` langsung dari komponen — lewati `business/`
- Jangan definisikan interface di dalam file komponen (kecuali props internal kecil)
- Jangan hardcode warna hex jika sudah ada di tema MUI (`primary.main`, `secondary.main`)
- Jangan buat axios instance baru — gunakan `api` dari `src/api/api.ts`
- Jangan campurkan business logic, state update, dan UI dalam satu fungsi di komponen
- Jangan skip TypeScript — tidak ada `any` tanpa alasan yang sangat kuat
- Jangan gunakan `barrel exports` (`index.ts`) — import langsung dari path file

---

## Tech Stack Referensi

| Library | Versi | Kegunaan |
|---------|-------|----------|
| React | ^19.2.0 | UI framework |
| TypeScript | ~5.9.3 | Type safety |
| Vite | ^7.2.4 | Build tool |
| Material-UI | ^7.3.9 | Komponen UI & styling |
| Zustand | ^5.0.11 | State management |
| React Router | ^7.13.0 | Routing |
| React Hook Form | ^7.71.1 | Form handling |
| Axios | ^1.13.4 | HTTP client |
| Notistack | ^3.0.2 | Toast notifications |
