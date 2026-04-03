

# Setup AstrBot di VPS Debian 12 + Integrasi System Snapshot MANTRA AI

## Konteks

Kamu punya VPS Debian 12 (2vCPU, 4GB RAM + 4GB swap) dengan CasaOS, dan ingin AstrBot (menggunakan Qwen3 235B / Qwen3.5-Flash) bisa "membaca" kondisi dashboard MANTRA AI untuk bantu troubleshooting dan pengembangan.

## Arsitektur Integrasi

```text
┌─────────────────────────┐
│  MANTRA AI Dashboard    │
│  (Lovable Cloud)        │
│                         │
│  Edge Function:         │
│  system-snapshot ──────────┐
└─────────────────────────┘  │  HTTPS GET (auth)
                             │
┌────────────────────────────▼──────────┐
│  VPS Debian 12 + CasaOS               │
│                                        │
│  ┌──────────┐  ┌────────────────────┐  │
│  │ AstrBot  │──│ Qwen3 / Qwen3.5   │  │
│  │ (Docker) │  │ (Ollama/vLLM)     │  │
│  └──────────┘  └────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐    │
│  │ Evolution API│  │ Frontend     │    │
│  │ :8080        │  │ :3000        │    │
│  └──────────────┘  └──────────────┘    │
└────────────────────────────────────────┘
```

## Langkah 1: Buat Edge Function `system-snapshot` (saya implementasi)

Edge function baru yang mengembalikan 1 JSON berisi:
- Daftar clients + quota + status
- Semua wa_sessions (status, last_error, last_webhook_event)
- Message stats hari ini (total messages, tokens)
- Platform settings aktif
- Document stats per client
- Recent wa_ops_logs (10 terakhir)

Endpoint: `GET /functions/v1/system-snapshot` (admin auth required)

Output contoh:
```json
{
  "timestamp": "2026-04-03T...",
  "clients": [...],
  "wa_sessions": [...],
  "message_stats_today": { "total_messages": 150, "total_tokens": 45000 },
  "platform_settings": { "ai_model": "gemini-2.5-flash", ... },
  "documents": { "total": 23, "by_status": { "ready": 20, "processing": 3 } },
  "recent_ops_logs": [...]
}
```

## Langkah 2: Setup AstrBot di VPS (panduan untuk kamu)

AstrBot bisa diinstall via CasaOS App Store atau Docker manual:

```bash
docker run -d \
  --name astrbot \
  -p 6185:6185 \
  -v /opt/astrbot/data:/AstrBot/data \
  --restart unless-stopped \
  soulter/astrbot:latest
```

Akses dashboard AstrBot di `http://<VPS-IP>:6185`.

### Catatan RAM untuk Qwen3 235B A22B:
- Model ini butuh ~50GB VRAM minimum (quantized Q4). VPS 4GB RAM **tidak cukup** untuk menjalankan model ini secara lokal.
- **Rekomendasi**: Gunakan Qwen3 235B via API cloud (OpenRouter, Together AI, atau self-hosted di GPU server terpisah), lalu set endpoint di AstrBot.
- Qwen3.5-Flash lebih ringan tapi tetap butuh ~8-16GB — masih mepet untuk VPS 4GB + swap.
- Alternatif lokal yang realistis: Qwen3-8B atau Qwen3-4B via Ollama.

## Langkah 3: Konfigurasi AstrBot untuk membaca snapshot

Di AstrBot, buat **custom plugin** atau gunakan fitur "tool/function calling":

1. **Tambahkan tool "check_mantra_status"** yang memanggil:
   ```
   GET https://jvyklrivwjubuwjdmvfq.supabase.co/functions/v1/system-snapshot
   Headers: Authorization: Bearer <admin-jwt-token>
   ```

2. **System prompt untuk AstrBot**:
   ```
   Kamu adalah asisten teknis untuk platform MANTRA AI.
   Gunakan tool check_mantra_status untuk melihat kondisi sistem terkini.
   Bantu admin mendiagnosa masalah WhatsApp, koneksi, dan quota.
   ```

3. **Refresh token**: JWT token expired setelah 1 jam. Untuk long-running bot, gunakan service role key atau buat endpoint tanpa JWT (dengan API key custom sebagai gantinya).

## Langkah 4: Tambah service AstrBot ke docker-compose (opsional)

Saya akan menambahkan block AstrBot (commented out) ke `docker-compose.yml` agar tinggal uncomment.

## Yang Saya Implementasi

| File | Aksi |
|------|------|
| `supabase/functions/system-snapshot/index.ts` | Edge function baru — JSON snapshot seluruh sistem |
| `docker-compose.yml` | Tambah block AstrBot (commented) |
| `README.md` | Tambah section "Integrasi AstrBot" |

## Yang Perlu Kamu Lakukan di VPS

1. Install AstrBot via Docker atau CasaOS
2. Pilih model yang sesuai RAM (rekomendasi: pakai API cloud untuk Qwen3 235B)
3. Konfigurasi tool/plugin di AstrBot untuk memanggil endpoint system-snapshot
4. Test dengan bertanya: "Bagaimana status sistem MANTRA AI sekarang?"

