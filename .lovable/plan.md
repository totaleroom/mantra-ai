

# 3 Enhancement MANTRA: Sector RAG + Badge + Client Overview

## Status Cepat

| Task | Status |
|------|--------|
| Task 2: Realtime Escalation Badge | SUDAH ADA -- sidebar sudah punya realtime subscription + pulsing badge |
| Task 1: Sector-Based RAG | Perlu dibangun |
| Task 3: `last_activity_at` + trigger | Perlu dibangun |

Task 2 sudah lengkap di `AdminSidebar.tsx` (line 31-57, 80-84). Tidak perlu diubah.

---

## Task 1: Intelligent Sector-Based RAG

### 1a. Migration: Update `search_documents` RPC

Buat ulang fungsi `search_documents` dengan parameter baru `p_role_tag text DEFAULT NULL`:

```text
CREATE OR REPLACE FUNCTION search_documents(p_client_id uuid, p_query text, p_limit int DEFAULT 3, p_role_tag text DEFAULT NULL)
  RETURNS TABLE(id uuid, content text, file_name text, chunk_index int, rank real)
  -- Tambah: AND (p_role_tag IS NULL OR d.role_tag = p_role_tag)
```

### 1b. Update `wa-webhook/index.ts`

Tambahkan fungsi `detectSector(message: string): string | null` sebelum `serve()`:

- **WAREHOUSE**: stok, sisa, habis, gudang, bahan baku, expired, pengiriman, ekspedisi, resi, packing, bikin, proses, antri, slot, jadwal, booking, penuh, unit, available
- **OWNER**: harga, diskon, discount, promo, voucher, cod, bayar, transfer, policy, kebijakan, refund, retur, komplain, owner, bos, cicilan, kpr, dp, nego
- **Return null** jika tidak ada keyword match

Logika matching: lowercase message, cek apakah mengandung salah satu keyword (word boundary aware via regex `\b`).

Update alur search (line 234-251):
1. `const roleTag = detectSector(messageText)`
2. Panggil `search_documents` dengan `p_role_tag: roleTag`
3. Jika hasil kosong DAN `roleTag !== null` --> fallback: panggil ulang tanpa `p_role_tag`
4. Jika masih kosong --> fallback ke query `documents` table langsung (existing logic)

---

## Task 3: High-Performance Client Overview

### 3a. Migration: `last_activity_at` column + trigger

Dalam migration file yang sama:

```text
1. ALTER TABLE clients ADD COLUMN last_activity_at timestamptz DEFAULT NULL

2. CREATE FUNCTION update_client_last_activity()
   -- Lookup client_id via: wa_conversations WHERE id = NEW.conversation_id
   -- UPDATE clients SET last_activity_at = NOW() WHERE id = client_id

3. CREATE TRIGGER trg_update_client_last_activity
   AFTER INSERT ON wa_messages
   FOR EACH ROW EXECUTE FUNCTION update_client_last_activity()
```

### 3b. Update `Clients.tsx`

Perubahan minimal karena `Clients.tsx` sudah membaca `last_activity_at` dan menampilkannya (line 41, 130-135, 418-427). Hanya perlu memastikan sort default sudah benar -- dan ini sudah ada di line 130-135.

Tidak ada perubahan kode di `Clients.tsx` -- sudah siap membaca kolom baru begitu migration dijalankan.

---

## Ringkasan File

| File | Aksi |
|------|------|
| Migration file baru | `search_documents` update + `last_activity_at` column + trigger function |
| `supabase/functions/wa-webhook/index.ts` | Tambah `detectSector()` + filtered search logic |
| `src/components/admin/AdminSidebar.tsx` | Tidak perlu diubah (sudah ada) |
| `src/pages/admin/Clients.tsx` | Tidak perlu diubah (sudah siap) |

### Urutan:
1. Migration (1 file: search_documents + last_activity_at + trigger)
2. Deploy wa-webhook dengan detectSector logic

