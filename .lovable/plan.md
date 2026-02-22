

# Dashboard Admin MANTRA — Senjata Perang Lengkap

## Ringkasan

Membangun admin dashboard lengkap di balik tombol "Juragan" dengan 4 halaman utama: Client Management, Device & Connection (QR WhatsApp), Knowledge Base (RAG Manager), dan Monitoring & Billing. Semua dilindungi Supabase Auth (email/password), hanya email admin yang bisa masuk.

---

## Phase 1: Fondasi (Supabase Cloud + Auth + Layout)

### 1a. Enable Lovable Cloud
Spin up Supabase backend via Lovable Cloud.

### 1b. Database Migration (satu migration besar)

**Tables:**

| Table | Kolom | Keterangan |
|-------|-------|------------|
| `admins` | id, user_id (FK auth.users), created_at | Daftar admin yang boleh login |
| `clients` | id, name, industry, subscription_plan, status, quota_remaining, quota_limit, created_at, updated_at | Data klien SME |
| `wa_sessions` | id, client_id (FK, unique), status ('connected'/'disconnected'), qr_code (text nullable), updated_at, created_at | Status koneksi WhatsApp |
| `documents` | id, client_id (FK), file_name, file_path, content, embedding (vector 1536), chunk_index, status ('processing'/'ready'/'error'), created_at | Dokumen RAG dengan embedding |
| `message_logs` | id, client_id (FK), message_count, token_usage, log_date (date), created_at | Log pesan harian per klien |
| `billing_alerts` | id, client_id (FK), alert_type ('quota_low'/'expiring'), message, is_read, created_at | Alert billing |

**Helper function:**
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.admins WHERE user_id = auth.uid()
) $$;
```

**RLS:** Semua tabel menggunakan `is_admin()` untuk SELECT/INSERT/UPDATE/DELETE.

**Realtime:** Enable pada `wa_sessions` untuk live QR update.

**Storage bucket:** `knowledge` (private) untuk file PDF/TXT.

**Extension:** `pgvector` untuk kolom embedding.

### 1c. Login Page (`/login`)
- Form email + password menggunakan Supabase `signInWithPassword`
- Redirect ke `/admin` jika berhasil
- Validasi admin: cek user ada di tabel `admins`, jika tidak langsung sign out
- Error handling dengan toast

### 1d. Auth Hook + Protected Route
- `useAuth.ts`: manage session, signIn, signOut
- `ProtectedRoute.tsx`: redirect ke `/login` jika belum login atau bukan admin

### 1e. Admin Layout + Sidebar
- `AdminLayout.tsx`: SidebarProvider + Sidebar + main content
- `AdminSidebar.tsx` dengan menu:
  - **Client Management** (`/admin/clients`) — Users icon
  - **Device & Connection** (`/admin/devices`) — Smartphone icon
  - **Knowledge Base** (`/admin/knowledge`) — BookOpen icon
  - **Monitoring & Billing** (`/admin/monitoring`) — BarChart3 icon
- Logo Mantra horizontal di atas sidebar
- Tombol logout di bawah
- Collapsible di mobile

---

## Phase 2: Halaman "Client Management" (CRUD)

### Route: `/admin/clients`

**Fitur:**
- Tabel list semua klien (searchable dengan input di atas)
- Kolom: Nama, Industri, Paket Langganan, Status, Actions
- **Status Indikator** (real-time dari `wa_sessions` + `clients`):
  - Hijau: WA Connected
  - Merah: Disconnected
  - Kuning: Kuota Habis (`quota_remaining <= 0`)
- Tombol "Add Client": Dialog form (Nama, Industri, Paket Langganan)
- Edit & Delete per baris
- Validasi Zod untuk semua field
- TanStack Query untuk data fetching

**Files baru:**
- `src/pages/admin/Clients.tsx`
- `src/components/admin/ClientForm.tsx`
- `src/components/admin/ClientDeleteDialog.tsx`
- `src/components/admin/ClientStatusBadge.tsx`

---

## Phase 3: Halaman "Device & Connection" (Integrasi WA)

### Route: `/admin/devices`

**Fitur:**
- Dropdown pilih Client
- Status badge: Connected (hijau) / Disconnected (merah)
- **QR Code Viewer** (fitur killer):
  - Subscribe Supabase Realtime pada `wa_sessions` filter by `client_id`
  - Saat VPS update kolom `qr_code` di DB, QR langsung render di dashboard
  - Menggunakan `react-qr-code` package
  - Tampil hanya saat status = disconnected dan qr_code ada
- Tombol **"Restart Session"**: Update `wa_sessions.status` ke 'disconnected', clear qr_code
- Tombol **"Logout"**: Delete row dari `wa_sessions`
- State: "Waiting for QR..." dengan spinner saat belum ada qr_code

**Files baru:**
- `src/pages/admin/DeviceManager.tsx`
- `src/components/admin/QRCodeDisplay.tsx`
- `src/components/admin/DeviceStatus.tsx`

**Dependency baru:** `react-qr-code`

---

## Phase 4: Halaman "Knowledge Base" (RAG Manager)

### Route: `/admin/knowledge`

**Fitur:**
- Dropdown pilih Client
- **Upload Area**: Drag & drop zone (PDF/TXT, max 20MB)
  - Upload ke Supabase Storage bucket `knowledge` path `{client_id}/{timestamp}_{filename}`
  - Insert row ke `documents` dengan status 'processing'
  - Trigger Edge Function `process-document`
- **Documents List**: Tabel file yang sudah diupload per client (nama file, status, tanggal)
- Status badge per dokumen: Processing (kuning) / Ready (hijau) / Error (merah)
- Delete dokumen (hapus file dari storage + row dari DB)

### Edge Function: `process-document`
- Download file dari Storage
- Extract text (TXT: baca langsung, PDF: parse)
- Chunking teks (split per ~500 token)
- Generate embedding via Lovable AI Gateway (atau OpenAI jika user punya API key)
- Simpan setiap chunk + embedding ke `documents`
- Update status ke 'ready'

### Testing Chatbox: "Test Bot Response"
- Input chat di bawah halaman Knowledge Base
- Kirim pertanyaan ke Edge Function `test-rag`
- Edge Function: cari dokumen paling relevan (cosine similarity pada embedding) lalu generate jawaban via Lovable AI
- Tampilkan jawaban streaming di chatbox

**Files baru:**
- `src/pages/admin/KnowledgeBase.tsx`
- `src/components/admin/FileUploadZone.tsx`
- `src/components/admin/DocumentsList.tsx`
- `src/components/admin/TestChatbox.tsx`
- `supabase/functions/process-document/index.ts`
- `supabase/functions/test-rag/index.ts`

---

## Phase 5: Halaman "Monitoring & Billing"

### Route: `/admin/monitoring`

**Fitur:**
- **Chart pesan harian per klien**: Bar chart menggunakan Recharts (sudah installed)
  - Data dari `message_logs` grouped by client + tanggal
  - Filter rentang tanggal (7 hari / 30 hari / custom)
  - Dropdown filter per client atau "Semua"
- **Alert Panel**: List alert aktif dari `billing_alerts`
  - Alert "Kuota Habis" (token boros)
  - Alert "Masa Aktif Mau Habis"
  - Badge unread count
  - Tombol "Mark as Read"
- **Summary Cards** di atas:
  - Total pesan hari ini (semua klien)
  - Total klien aktif
  - Klien dengan kuota terendah
  - Alert belum dibaca

**Files baru:**
- `src/pages/admin/Monitoring.tsx`
- `src/components/admin/MessageChart.tsx`
- `src/components/admin/AlertPanel.tsx`
- `src/components/admin/StatCards.tsx`

---

## Struktur File Lengkap

```text
src/
  hooks/
    useAuth.ts
  components/
    admin/
      AdminSidebar.tsx
      AdminLayout.tsx
      ProtectedRoute.tsx
      ClientForm.tsx
      ClientDeleteDialog.tsx
      ClientStatusBadge.tsx
      QRCodeDisplay.tsx
      DeviceStatus.tsx
      FileUploadZone.tsx
      DocumentsList.tsx
      TestChatbox.tsx
      MessageChart.tsx
      AlertPanel.tsx
      StatCards.tsx
  pages/
    Login.tsx (updated)
    admin/
      Clients.tsx
      DeviceManager.tsx
      KnowledgeBase.tsx
      Monitoring.tsx

supabase/
  config.toml
  functions/
    process-document/index.ts
    test-rag/index.ts
  migrations/
    XXXXXX_full_schema.sql
```

## File yang Dimodifikasi
- `src/App.tsx` — tambah semua route `/admin/*` dengan ProtectedRoute
- `src/pages/Login.tsx` — form login real dengan Supabase Auth

---

## Yang Perlu Dari Anda

1. **Email admin** — untuk di-seed ke tabel `admins` setelah signup pertama
2. **API key OpenAI** (opsional) — untuk embedding yang lebih akurat. Jika tidak ada, kita gunakan Lovable AI Gateway sebagai alternatif

---

## Urutan Implementasi

1. Enable Lovable Cloud + migration database
2. Auth (login, useAuth, ProtectedRoute)
3. Admin layout + sidebar
4. Client Management (CRUD + status badge)
5. Device & Connection (QR viewer + Realtime)
6. Knowledge Base (upload + edge function + test chatbox)
7. Monitoring & Billing (chart + alerts)

