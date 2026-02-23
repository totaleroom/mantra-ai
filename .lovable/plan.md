

# AI Configuration Transparency & Behavior Pipeline

## Masalah

Banyak perilaku kritis AI yang hardcoded di `wa-webhook/index.ts` dan tidak bisa diubah tanpa edit kode. Admin tidak tahu apa yang terjadi "di balik layar" ketika AI merespon.

## Solusi: Enhanced AI Settings + Webhook Update

Daripada membangun sistem node visual seperti n8n (yang membutuhkan ratusan jam development), kita buat **AI Behavior Configuration** yang transparan di halaman Settings -- semua parameter yang mengontrol perilaku AI bisa dilihat dan diubah oleh admin.

---

## Kenapa BUKAN n8n-style Node Editor

| Aspek | n8n-style Nodes | AI Behavior Config |
|-------|----------------|-------------------|
| Development time | 200+ jam (drag-drop, canvas, node types) | 8-10 jam |
| Maintenance | Sangat kompleks | Minimal |
| User skill needed | Perlu pemahaman teknis | Form sederhana |
| Fleksibilitas | Sangat tinggi | Cukup untuk 95% use case |
| Risk | Over-engineering | Pragmatis |

Jika nanti kebutuhan benar-benar memerlukan visual pipeline, bisa diintegrasikan dengan n8n yang sudah ada (via MCP connector) daripada membangun ulang dari nol.

---

## Perubahan Detail

### 1. Settings UI (`src/pages/admin/Settings.tsx`)

Rombak tab "AI Configuration" menjadi lebih komprehensif dengan 3 section:

**Section A: Model & Prompt (sudah ada, diperbaiki)**
- Model selector (sudah ada)
- Temperature slider (sudah ada)
- Max tokens (sudah ada)
- System prompt + presets (sudah ada)
- BARU: **Context injection mode** -- dropdown: "Append to prompt" / "Replace {{context}} placeholder"
- BARU: **Business name override** -- input text (saat ini selalu pakai `clients.name`)

**Section B: AI Behavior Pipeline (BARU)**
Tampilan visual sederhana yang menunjukkan alur keputusan AI:

```
[Pesan Masuk] --> [Cek RAG Context] --> [Ada?]
                                          |
                                     Ya --+--> [Kirim ke AI + Context]
                                          |
                                     Tidak -> [??? Configurable]
```

Setting yang bisa diubah:
- **No-RAG Fallback Action** -- dropdown:
  - "Eskalasi ke admin" (default saat ini)
  - "Jawab tanpa context" (AI tetap jawab tapi tanpa RAG)
  - "Kirim pesan custom" (admin tulis pesan fallback sendiri)
- **No-RAG Fallback Message** -- textarea (muncul jika pilih "Kirim pesan custom")
- **Escalation Keyword** -- input text (default: "ESKALASI_HUMAN", bisa diganti)
- **Escalation Message** -- textarea (sudah ada settingnya tapi belum dipakai di webhook!)

**Section C: Context & Memory (BARU)**
- **History Length** -- slider 1-20 (default: 10) -- berapa pesan terakhir dikirim ke AI
- **History Char Limit** -- input number (default: 3000) -- batas karakter untuk trimming
- **RAG Result Count** -- input number 1-10 (default: 3) -- berapa chunk dokumen dicari
- **Sector Detection** -- toggle on/off (default: on) -- apakah pakai deteksi sektor WAREHOUSE/OWNER

---

### 2. Webhook Update (`supabase/functions/wa-webhook/index.ts`)

Update webhook untuk membaca semua config baru dari `platform_settings` (tabel `cfg` sudah di-load di line 292-298):

**Perubahan spesifik:**

a) **No-RAG Fallback** (line 444-449):
```
// Sebelum: hardcoded eskalasi
// Sesudah: baca cfg.no_rag_action
const noRagAction = cfg.no_rag_action || "escalate";
if (contextChunks.length === 0) {
  if (noRagAction === "escalate") {
    await escalateToHuman(...);
  } else if (noRagAction === "answer_without") {
    // Lanjut ke AI tanpa context (context = "")
  } else if (noRagAction === "custom_message") {
    const msg = cfg.no_rag_message || "Maaf, saya belum bisa menjawab.";
    await sendWhatsAppMessage(phoneNumber, msg, instanceName);
    await supabaseAdmin.from("wa_messages").insert({...});
    return ...;
  }
}
```

b) **Escalation Message** (line 610):
```
// Sebelum: hardcoded
const escalationMsg = "Mohon tunggu kak...";
// Sesudah: baca dari config
const escalationMsg = (cfg.escalation_message || "Mohon tunggu kak, saya sedang menyambungkan dengan Admin kami. 🙏").replace(/^"|"$/g, "");
```

c) **Escalation Keyword** (line 537):
```
// Sebelum: hardcoded "ESKALASI_HUMAN"
// Sesudah:
const escalationKeyword = cfg.escalation_keyword || "ESKALASI_HUMAN";
if (answer.includes(escalationKeyword)) { ... }
```

d) **History Length** (line 401):
```
// Sebelum: hardcoded .limit(10)
const historyLength = parseInt(cfg.history_length || "10");
.limit(historyLength)
```

e) **History Char Limit** (line 404):
```
const charLimit = parseInt(cfg.history_char_limit || "3000");
const trimmedMessages = trimHistoryByCharLimit(historyMessages, charLimit);
```

f) **RAG Result Count** (line 415):
```
const ragLimit = parseInt(cfg.rag_result_count || "3");
p_limit: ragLimit,
```

g) **Sector Detection Toggle** (line 408):
```
const useSectorDetection = cfg.sector_detection !== "false";
const roleTag = useSectorDetection && searchText ? detectSector(searchText) : null;
```

---

### 3. Setting Keys Baru di `platform_settings`

| Key | Default | Deskripsi |
|-----|---------|-----------|
| `no_rag_action` | `"escalate"` | Aksi jika tidak ada RAG context |
| `no_rag_message` | `""` | Pesan custom jika no_rag_action = custom_message |
| `escalation_keyword` | `"ESKALASI_HUMAN"` | Kata kunci trigger eskalasi dari AI |
| `escalation_message` | `"Mohon tunggu kak..."` | Pesan ke customer saat eskalasi (sudah ada, belum dipakai) |
| `history_length` | `"10"` | Jumlah pesan history ke AI |
| `history_char_limit` | `"3000"` | Batas karakter history |
| `rag_result_count` | `"3"` | Jumlah chunk RAG yang dicari |
| `sector_detection` | `"true"` | Toggle deteksi sektor WAREHOUSE/OWNER |

Tidak perlu migrasi SQL karena `platform_settings` adalah key-value store -- setting baru otomatis tersimpan saat admin save.

---

## File yang Diubah

| File | Aksi |
|------|------|
| `src/pages/admin/Settings.tsx` | Rombak tab "AI Configuration" -- tambah Section B (Behavior) dan C (Context & Memory) |
| `supabase/functions/wa-webhook/index.ts` | Baca semua config baru dari `cfg`, ganti hardcoded values |

## Yang TIDAK Diubah

- Database schema (tidak perlu migrasi)
- Hooks (`useAdminData.ts`)
- Sidebar, layout, dashboard

## Urutan Implementasi

1. Update `wa-webhook/index.ts` -- baca semua config baru dengan fallback ke default
2. Update `Settings.tsx` -- tambah UI controls untuk semua config baru
3. Deploy edge function

