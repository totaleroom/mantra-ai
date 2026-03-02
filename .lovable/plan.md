

# Audit Performa, Stabilitas & Dokumentasi — MANTRA AI

## Ringkasan

Prompt Anda yang sudah saya perbaiki:
> "Lakukan audit menyeluruh terhadap: (1) struktur teknis dan arsitektur kode, (2) kecepatan loading & performa halaman, (3) stabilitas dashboard dan pembatasan agar tidak lag, (4) efisiensi komunikasi frontend-backend, (5) optimasi ukuran bundle tanpa merusak fungsionalitas, dan (6) perbarui README serta dokumentasi agar mencerminkan kondisi terkini."

Berikut temuan dan rencana perbaikan berdasarkan audit kode:

---

## Temuan Audit

### A. Performa & Kecepatan Loading

**Masalah 1: Semua halaman di-import secara eager (tidak ada code splitting)**
- `App.tsx` meng-import 7 halaman admin + landing + login secara langsung.
- Landing page saja sudah memuat 15 komponen sekaligus.
- Akibatnya: bundle JavaScript yang dikirim ke browser sangat besar, meskipun user hanya buka satu halaman.

**Masalah 2: Dashboard memuat 9 query sekaligus saat pertama buka**
- `Dashboard.tsx` memanggil 9 custom hooks (`useAttentionItems`, `useSystemHealth`, `useClients`, dll) yang semua jalan paralel.
- Ini tidak salah secara teknis, tapi tanpa prioritas visual (mana yang muncul dulu di layar) bisa terasa lambat.

**Masalah 3: DeviceManager.tsx tidak pakai React Query**
- `DeviceManager.tsx` (555 baris) masih pakai `useState` + `useEffect` manual untuk fetch data.
- Ini berarti: tidak ada caching, tidak ada deduplication, setiap navigasi ulang akan fetch ulang dari nol.
- Halaman admin lain sudah pakai React Query.

### B. Stabilitas & Anti-Lag

**Masalah 4: Realtime channel di DeviceManager tidak dibatasi**
- Setiap kali ganti client, channel baru dibuat tanpa debounce.
- Jika user cepat ganti-ganti client, bisa terjadi tumpukan channel.

**Masalah 5: InstanceCard auto-refresh tanpa cleanup yang solid**
- `setInterval` di InstanceCard bisa race condition jika komponen unmount saat timer aktif.
- Dependency array `useEffect` tidak lengkap (miss `name`, `isAnyLoading`).

**Masalah 6: QueryClient dibuat tanpa konfigurasi default**
- Tidak ada `defaultOptions` untuk retry, staleTime, atau error handling global.
- Jika backend lambat, query akan retry 3x secara default tanpa user tahu.

### C. Frontend-Backend Bridge

**Masalah 7: `callManageInstance` di DeviceManager membangun URL secara manual**
- Tidak pakai `supabase.functions.invoke()` yang sudah ada.
- Ini membuat penanganan auth token, error, dan URL tidak konsisten dengan halaman lain.

**Masalah 8: Type casting `as any` di mana-mana**
- `useAdminData.ts` menggunakan `.from("clients" as any)` di setiap query.
- Ini menghilangkan type safety dan bisa menyembunyikan bug.

### D. Ukuran yang Bisa Dioptimasi

**Masalah 9: Landing page memuat semua 15 section sekaligus**
- Komponen seperti `ROICalculator`, `AdminCostCalculator`, `FAQ` tidak perlu dimuat sampai user scroll ke sana.

**Masalah 10: Edge function `wa-webhook` dan `manage-wa-instance` sangat besar**
- `wa-webhook`: 768 baris, `manage-wa-instance`: 929 baris.
- Ini bukan masalah bundle frontend, tapi maintainability dan cold-start time backend.

### E. Dokumentasi

**Masalah 11: README belum mencerminkan fitur terbaru**
- Belum ada dokumentasi tentang: diagnostik 2 arah, health check, reconnect wizard, wa_ops_logs.
- Versi "V2.4.0" di Dashboard hardcoded tapi tidak ada changelog.

---

## Rencana Implementasi

### Fase 1 — Code Splitting & Lazy Loading (Kecepatan)

1. **Lazy-load semua halaman admin**
   - Ubah import di `App.tsx` menjadi `React.lazy()` + `Suspense`.
   - Halaman yang di-lazy: Dashboard, Clients, DeviceManager, KnowledgeBase, Monitoring, Inbox, Settings.
   - Landing page dan Login juga di-lazy.
   - Ini akan memecah bundle menjadi chunk terpisah per halaman.

2. **Tambah loading fallback yang konsisten**
   - Buat komponen `PageLoader` sederhana (skeleton/spinner) untuk `Suspense fallback`.

### Fase 2 — Stabilitas Dashboard

3. **Migrasi DeviceManager ke React Query**
   - Pindahkan fetch clients dan sessions ke hook di `useAdminData.ts`.
   - Gunakan `useQuery` dengan `staleTime` dan caching.
   - Ini menghilangkan fetch ulang setiap navigasi.

4. **Konfigurasi QueryClient dengan default yang wajar**
   - Tambah `defaultOptions`:
     - `retry: 1` (bukan 3)
     - `staleTime: 30_000` (30 detik)
     - `refetchOnWindowFocus: false` (tidak refetch saat tab kembali aktif)
   - Ini mencegah request berlebihan saat user multitab.

5. **Perbaiki dependency array di InstanceCard**
   - Tambahkan `name` dan `isAnyLoading` ke dependency.
   - Pastikan cleanup timer solid.

### Fase 3 — Frontend-Backend Bridge

6. **Ganti `callManageInstance` dengan `supabase.functions.invoke`**
   - Ini menstandarkan auth handling dan error parsing.
   - Lebih konsisten dengan pattern di halaman lain (Settings, KnowledgeBase).

7. **Tambah error boundary global**
   - Bungkus `AdminLayout` dengan React Error Boundary.
   - Jika ada crash di satu halaman admin, tidak membuat seluruh dashboard putih.

### Fase 4 — Optimasi Ukuran

8. **Lazy-load komponen landing page berat**
   - `AdminCostCalculator`, `ROICalculator`, `ChatDemo` di-lazy dengan intersection observer sederhana.
   - Komponen ringan (Hero, Navbar, Footer) tetap eager.

### Fase 5 — Dokumentasi

9. **Perbarui README.md**
   - Tambah section fitur terbaru: Diagnostik 2 Arah, Health Check, Reconnect Wizard, Ops Logs.
   - Perbarui tabel fitur (status semua fitur baru jadi "Ready").
   - Tambah section "Changelog" ringkas.
   - Update versi arsitektur.

10. **Perbarui PROJECT_NORTH_STAR.md**
    - Tambah pattern lazy loading sebagai standar.
    - Tambah aturan React Query default config.

---

## File yang Terdampak

| File | Perubahan |
|------|-----------|
| `src/App.tsx` | Lazy import semua halaman |
| `src/pages/admin/DeviceManager.tsx` | Migrasi ke React Query, ganti callManageInstance |
| `src/hooks/useAdminData.ts` | Tambah hooks untuk DeviceManager |
| `src/components/admin/InstanceCard.tsx` | Fix dependency array |
| `src/components/admin/AdminLayout.tsx` | Tambah Error Boundary |
| `src/pages/Index.tsx` | Lazy-load section berat |
| `README.md` | Update dokumentasi fitur terbaru |

---

## Kriteria Sukses

- Halaman pertama (landing) memuat lebih cepat karena admin pages tidak ikut di-bundle.
- Navigasi antar halaman admin tetap instan berkat React Query cache.
- Tidak ada "fetch ulang dari nol" saat kembali ke DeviceManager.
- Error di satu halaman tidak crash seluruh dashboard.
- README mencerminkan kondisi sistem yang sebenarnya.

