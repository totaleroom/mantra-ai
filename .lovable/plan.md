

# Perbaikan Performa: Migrasi ke React Query + Optimasi Query

## Masalah Utama

Setiap kali navigasi antar halaman admin, SEMUA data di-fetch ulang dari nol. Tidak ada caching. Ini menyebabkan loading spinner muncul setiap kali pindah halaman.

Contoh: buka Dashboard (8 query) -> klik Clients (3 query) -> klik balik Dashboard (8 query lagi). Total 19 query untuk 3 klik.

---

## Solusi: React Query + Query Deduplication

### Langkah 1: Buat Custom Hooks dengan React Query

Buat file `src/hooks/useAdminData.ts` yang berisi shared hooks:

- `useClients()` -- fetch clients list, cached 30 detik
- `useHumanEscalationCount()` -- fetch HUMAN conversation count, cached 10 detik
- `useActiveConversations()` -- fetch active conversations, cached 15 detik  
- `useMessageStats()` -- fetch message_logs today, cached 30 detik
- `useSystemHealth()` -- fetch wa_sessions + platform_settings, cached 60 detik

Setiap hook menggunakan `useQuery` dengan `staleTime` yang sesuai, sehingga data di-cache dan tidak di-fetch ulang jika masih fresh.

### Langkah 2: Update Dashboard.tsx

- Ganti manual `useState + useEffect + fetch` dengan hooks dari langkah 1
- Hapus `loading` state manual -- React Query sudah handle `isLoading`
- Data langsung muncul dari cache jika user sudah pernah buka halaman ini
- Tambah `refetchInterval` untuk data kritikal (escalation count: 10 detik)

### Langkah 3: Update AdminSidebar.tsx

- Ganti manual fetch + realtime subscription dengan `useHumanEscalationCount()` hook
- Hook ini di-share dengan Dashboard, jadi query hanya jalan 1x
- Tetap pakai realtime subscription, tapi trigger `queryClient.invalidateQueries` instead of manual re-fetch

### Langkah 4: Update Clients.tsx

- Ganti manual fetch dengan `useClients()` + `useActiveConversations()`
- Data muncul instant dari cache saat user navigasi kembali ke halaman ini
- Tetap bisa manual refresh via `queryClient.invalidateQueries`

### Langkah 5: Update InboxSidebar.tsx

- Buat `useInboxConversations(clientId)` hook
- Realtime INSERT pada `wa_messages`: hanya invalidate query, bukan re-fetch semua
- Realtime change pada `wa_conversations`: hanya invalidate query

### Langkah 6: Optimasi minor

- `KnowledgeBase.tsx`: wrap fetch dalam useQuery
- `Settings.tsx`: wrap edge function calls dalam useQuery
- `Monitoring.tsx`: wrap fetch dalam useQuery

---

## Detail Teknis

### File baru:
- `src/hooks/useAdminData.ts` -- Semua shared React Query hooks

### File yang dimodifikasi:
- `src/pages/admin/Dashboard.tsx` -- Ganti manual fetch dengan hooks
- `src/components/admin/AdminSidebar.tsx` -- Ganti manual fetch dengan shared hook
- `src/pages/admin/Clients.tsx` -- Ganti manual fetch dengan hooks
- `src/components/admin/InboxSidebar.tsx` -- Ganti manual fetch dengan hooks + smarter realtime
- `src/pages/admin/KnowledgeBase.tsx` -- Wrap dalam useQuery
- `src/pages/admin/Settings.tsx` -- Wrap edge function calls dalam useQuery
- `src/pages/admin/Monitoring.tsx` -- Wrap dalam useQuery

### Hasil yang diharapkan:
- Navigasi antar halaman: **instant** (data dari cache)
- Loading spinner hanya muncul pada **kunjungan pertama**
- Query duplikat dieliminasi (AdminSidebar + Dashboard share hook yang sama)
- Realtime update tetap bekerja, tapi lebih efisien (invalidate vs re-fetch all)
- Total query per session berkurang ~60-70%

### Tidak perlu migration database -- murni optimasi frontend.
