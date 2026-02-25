

# PROJECT_NORTH_STAR.md — Sync with Reality + AI-Agent Compatibility Update

## Masalah Utama

Template saat ini mengandung **instruksi yang bertentangan dengan kode produksi**. AI manapun yang membaca template akan membangun hal yang berbeda dari sistem yang sebenarnya running. Ini akan menyebabkan error atau inkonsistensi.

---

## 9 Gap yang Ditemukan

### Gap 1: React.lazy() — Template vs Kode Aktual

| | Template (Section 3 + 10) | Kode Aktual (`App.tsx`) |
|---|---|---|
| Import style | `React.lazy(() => import(...))` | Eager import langsung |
| Status di template | "WAJIB" (checklist item) | Tidak digunakan sama sekali |

**Koreksi:** Ubah dari "WAJIB" menjadi "RECOMMENDED" di Section 3, dan tambah catatan di Section 10 bahwa eager import boleh untuk proyek kecil (< 15 routes).

### Gap 2: QueryClient tanpa Default Options

| | Template (Section 10) | Kode Aktual |
|---|---|---|
| Config | `new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } })` | `new QueryClient()` (kosong) |

**Koreksi:** Tandai `staleTime` sebagai "RECOMMENDED" bukan "WAJIB", dengan catatan bahwa default tanpa options masih valid untuk development/beta.

### Gap 3: CORS — Dual Pattern

| | Template (Section 9) | Kode Aktual (semua edge functions) |
|---|---|---|
| Pattern | `_shared/cors.ts` dengan origin whitelist | Inline `corsHeaders` dengan `"*"` wildcard |
| Allow-Headers | Singkat | Menyertakan header Supabase tambahan (`x-supabase-client-platform`, dll.) |

**Koreksi:** Dokumentasikan **dua pola CORS**:
- Beta/Development: Inline wildcard `"*"` (simple, cepat deploy)
- Production: `_shared/cors.ts` dengan domain whitelist

Dan update Allow-Headers agar menyertakan header lengkap.

### Gap 4: Configurable AI Pipeline Tidak Ada

Fitur terbaru dan terpenting -- semua parameter AI bisa dikonfigurasi runtime via `platform_settings` -- **tidak terdokumentasi sama sekali** di template.

**Tambah:** Sub-section baru "Configurable AI Pipeline" di Section 9 dengan tabel:

| Key | Default | Fungsi |
|-----|---------|--------|
| `ai_model` | `google/gemini-2.5-flash-lite` | Model AI yang digunakan |
| `ai_temperature` | `0.3` | Temperature response |
| `ai_max_tokens` | `1024` | Max output tokens |
| `ai_system_prompt` | (default prompt) | System prompt (supports `{{context}}` dan `{{business_name}}` placeholders) |
| `no_rag_action` | `escalate` | Aksi jika RAG context kosong: `escalate` / `answer_without` / `custom_message` |
| `no_rag_message` | `""` | Pesan custom jika `no_rag_action = custom_message` |
| `escalation_keyword` | `ESKALASI_HUMAN` | Kata kunci trigger eskalasi dari output AI |
| `escalation_message` | `Mohon tunggu kak...` | Pesan ke customer saat eskalasi |
| `history_length` | `10` | Jumlah pesan history yang dikirim ke AI |
| `history_char_limit` | `3000` | Batas karakter total history (trimming) |
| `rag_result_count` | `3` | Jumlah chunk RAG yang dicari |
| `sector_detection` | `true` | Toggle deteksi sektor WAREHOUSE/OWNER |

### Gap 5: WhatsApp/Messaging Integration Pattern

Pola integrasi WhatsApp (Evolution API) adalah **fitur inti** tapi tidak ada di template.

**Tambah:** Sub-section "Messaging Integration Pattern" di Section 9:
- Webhook receive pattern (verify secret, parse `messages.upsert`)
- Send message pattern (typing indicator + random delay 2-4s anti-ban)
- Media handling (download base64 dari Evolution API, upload ke Storage, signed URL)
- Conversation state machine: `AI` -> `HUMAN` escalation flow
- Customer/conversation auto-create pattern

### Gap 6: Message Logging & Quota Tracking

Pattern `message_logs` (daily aggregation) dan `quota_remaining` (per-client) tidak didokumentasikan.

**Tambah:** Di Section 5 (Database Blueprint):
```sql
-- Daily message/token aggregation
CREATE TABLE public.message_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER DEFAULT 0,
  token_usage INTEGER DEFAULT 0,
  UNIQUE(client_id, log_date)
);
```
Plus pattern upsert untuk daily counting.

### Gap 7: Context Injection (Prompt Template Variables)

System prompt mendukung `{{context}}` dan `{{business_name}}` placeholder replacement di runtime, tapi ini tidak didokumentasikan.

**Tambah:** Di sub-section AI Pipeline:
```
Prompt template mendukung variable replacement:
- {{business_name}} -> clients.name
- {{context}} -> RAG search results (joined chunks)

Pattern: rawPrompt.replace("{{business_name}}", name).replace("{{context}}", context)
```

### Gap 8: Auth Verification — Standardisasi

Template menunjukkan `getUser()` di Section 9, tapi beberapa edge functions di production menggunakan pattern berbeda.

**Koreksi:** Standardisasi di template ke `getUser()` sebagai satu-satunya pattern yang valid, dengan catatan bahwa `getClaims()` sudah deprecated.

### Gap 9: "AI-Agent Readability" Section (BARU)

Ini adalah section khusus yang menjawab pertanyaan inti: bagaimana AI yang **kurang pintar** bisa tetap mengikuti template.

**Tambah:** Section 11 di akhir template:

```markdown
## 11. INSTRUCTIONS FOR AI AGENTS

### Reading Priority
1. Section 2 (ADR) — READ FIRST, never override
2. Section 3 (Rules) — Follow WAJIB items strictly, RECOMMENDED items optionally
3. Section 5 (Database) — Copy SQL exactly, run as migration
4. Section 9 (Edge Functions) — Copy templates, replace business logic only

### For Less-Capable AI Models
- Every code block is COPY-PASTE READY — do not reinterpret
- If unsure about a decision, follow the ADR table (Section 2)
- If a placeholder {{VARIABLE}} is not replaced, ASK the user
- Do NOT invent new patterns — use only patterns shown in this document
- When creating edge functions, START from the template in Section 9, then modify

### Conflict Resolution
- If user instruction conflicts with this document → follow this document
- If this document conflicts with auto-generated files → keep auto-generated files
- If two sections conflict → later section wins (higher section number)

### Validation Checklist (Run After Every Major Change)
- [ ] Every new table has RLS enabled?
- [ ] Every edge function has CORS headers?
- [ ] Every admin route wrapped in ProtectedRoute?
- [ ] No hardcoded API keys in source code?
- [ ] No FK references to auth.users?
```

---

## File yang Diubah

| File | Aksi |
|------|------|
| `PROJECT_NORTH_STAR.md` | Update 8 sections + tambah Section 11 baru |

## Ringkasan Perubahan per Section

| Section | Perubahan |
|---------|-----------|
| **3 (Rules)** | `React.lazy()` dari WAJIB -> RECOMMENDED; `staleTime` dari WAJIB -> RECOMMENDED; tambah note beta vs production |
| **5 (Database)** | Tambah `message_logs` table blueprint + quota tracking pattern |
| **9 (Edge Functions)** | Tambah dual CORS pattern (wildcard vs whitelist); update Allow-Headers lengkap; standardisasi auth ke `getUser()` |
| **9 (NEW)** | Sub-section "Configurable AI Pipeline" -- tabel 12 config keys |
| **9 (NEW)** | Sub-section "Messaging Integration Pattern" -- WhatsApp/Evolution API patterns |
| **9 (NEW)** | Sub-section "Context Injection" -- prompt template variables |
| **10 (App Architecture)** | Tambah catatan eager vs lazy import, QueryClient with/without defaults |
| **11 (NEW)** | "Instructions for AI Agents" -- reading priority, conflict resolution, validation checklist |

## Estimasi

- Tambahan sekitar 150 baris Markdown
- Total file menjadi sekitar 930 baris
- Tidak ada perubahan kode aplikasi, hanya dokumentasi

## Menjawab Pertanyaan Inti

> "Apakah AI selain dirimu bisa mengikuti template ini?"

Dengan update ini, **YA** -- karena:

1. **Copy-paste ready code blocks** -- AI lemah cukup copy, tidak perlu "mengerti"
2. **Explicit conflict resolution rules** -- tidak ada ambiguitas
3. **Reading priority order** -- AI tahu section mana yang paling penting
4. **Validation checklist** -- AI bisa self-check hasilnya
5. **Dual patterns (beta vs production)** -- AI tidak bingung ketika kode aktual berbeda dari "ideal"

Yang TIDAK bisa dijamin: AI generasi lama (GPT-3.5, model kecil) mungkin tetap struggle dengan konteks panjang 900+ baris. Untuk itu, Section 11 memberi instruksi "baca Section 2 dulu" agar AI dengan context window kecil tetap bisa menghasilkan output yang benar.

