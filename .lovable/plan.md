

# Diagnosis: Login Lambat & Pertanyaan Kemandirian Platform

## Akar Masalah Login Lambat

`useAuth()` saat ini adalah **plain hook** (bukan Context). Setiap komponen yang memanggilnya membuat instance terpisah dengan state dan listener sendiri.

Alur saat ini setelah klik "Masuk":

```text
Login.tsx: signIn() -> navigate("/admin/clients")
                            |
                            v
ProtectedRoute: useAuth() baru -> loading=true
                   |                    |
                   v                    v
           onAuthStateChange()    getSession()
                   |                    |
                   v                    v
             is_admin() RPC       is_admin() RPC    <-- 2 panggilan duplikat
                   |                    |
                   v                    v
              setLoading(false)   setLoading(false)  <-- race condition
```

Total delay: **~1-3 detik** (2x RPC + 2x auth check + lazy load chunk).

Masalah spesifik:
1. **Duplikasi**: `useAuth()` di Login dan ProtectedRoute adalah 2 instance berbeda, masing-masing memasang listener dan memanggil `getSession` + `is_admin` secara terpisah.
2. **Double RPC**: Setiap instance memanggil `is_admin()` 2 kali (dari `onAuthStateChange` DAN `getSession`).
3. **Tidak ada shared state**: Setelah login berhasil di Login.tsx, ProtectedRoute tidak tahu hasilnya — harus cek ulang dari nol.

## Solusi: AuthContext Provider

Ubah `useAuth` dari plain hook menjadi **React Context** sehingga seluruh app berbagi satu state autentikasi.

Setelah fix:
```text
Login.tsx: signIn() -> navigate("/admin/clients")
                            |
                            v
ProtectedRoute: useAuth() -> membaca dari Context
                             -> user & isAdmin sudah tersedia
                             -> loading=false (instan)
                             -> TIDAK ada RPC tambahan
```

## Rencana Implementasi

### 1. Buat AuthContext Provider
- File baru: `src/contexts/AuthContext.tsx`
- Pindahkan semua logic dari `useAuth.ts` ke context provider
- `onAuthStateChange` + `getSession` hanya jalan SEKALI di level App
- Hindari double RPC: gunakan flag untuk mencegah `getSession` memanggil `is_admin` jika `onAuthStateChange` sudah menangani

### 2. Update useAuth hook
- `src/hooks/useAuth.ts` menjadi thin wrapper yang membaca dari context
- Semua consumer (Login, ProtectedRoute, AdminSidebar) otomatis dapat state yang sama

### 3. Pasang Provider di App.tsx
- Bungkus `BrowserRouter` dengan `AuthProvider`
- Satu listener, satu state, seluruh app

### 4. Optimasi tambahan
- Setelah `signIn` berhasil, set `isAdmin` langsung di context (karena `onAuthStateChange` akan segera fire dengan session baru)
- Tambahkan guard agar `is_admin` RPC tidak dipanggil ulang jika sudah diketahui

## File yang Terdampak

| File | Perubahan |
|------|-----------|
| `src/contexts/AuthContext.tsx` | **Baru** - AuthProvider + context |
| `src/hooks/useAuth.ts` | Menjadi wrapper context |
| `src/App.tsx` | Tambah AuthProvider |
| `src/pages/Login.tsx` | Tidak perlu berubah (useAuth API sama) |
| `src/components/admin/ProtectedRoute.tsx` | Tidak perlu berubah |

## Menjawab Pertanyaan Anda

**"Apakah ada log untuk mengetahui apa yang terjadi?"**
- Ya, Anda bisa melihat log operasional di tabel `wa_ops_logs` dari dashboard.
- Auth logs tercatat di backend dan bisa saya baca untuk debugging.
- Console browser juga bisa saya baca saat Anda melaporkan masalah.

**"Apakah tim maintenance/developer bisa mengetahui?"**
- Ya. Kode ini adalah React + TypeScript standar industri. Developer mana pun yang menguasai React bisa langsung baca dan modifikasi.
- README sudah lengkap dengan arsitektur, struktur folder, dan panduan deployment.
- Tidak ada "black box" — semua logic ada di source code yang bisa di-export ke GitHub.

**"Apakah platform ini bisa mandiri tanpa vibe coding?"**
- **Ya, 100%.** Ini adalah aplikasi React + Vite standar yang bisa di-build dan deploy di mana saja (VPS, Vercel, Netlify).
- Backend menggunakan PostgreSQL + Edge Functions — keduanya open source dan portable.
- Jika suatu hari Anda ingin lepas dari platform ini, cukup `git clone` + `npm install` + `npm run build` dan deploy sendiri.
- Tim developer bisa mengembangkan menggunakan VS Code, WebStorm, atau editor apapun.

**"Bagaimana mendelegasikan ke human developer?"**
- Export ke GitHub (sudah didukung via Settings -> GitHub)
- README berisi panduan lengkap untuk setup lokal dan deployment
- Struktur folder mengikuti konvensi React standar
- Semua edge function ada di `supabase/functions/` dengan kode yang bisa dibaca langsung

## Kriteria Sukses
- Login ke dashboard terasa instan (< 500ms setelah klik Masuk)
- Tidak ada duplikasi panggilan `is_admin` RPC
- API `useAuth()` tidak berubah — semua komponen tetap bekerja tanpa modifikasi

