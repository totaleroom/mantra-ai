

# Setup Evolution API Secrets untuk MANTRA AI

## Yang Perlu Dilakukan

Menyimpan 3 secret ke backend agar edge functions `wa-webhook` dan `wa-send-message` bisa terhubung ke Evolution API di VPS Contabo Anda.

## 3 Secret yang Akan Disimpan

| Secret | Nilai | Catatan |
|--------|-------|---------|
| `EVOLUTION_API_URL` | `http://147.93.152.59:8080` | IP VPS + port 8080 (HTTP sementara) |
| `EVOLUTION_API_KEY` | `ecd15824c3c22a12...` | Dari docker-compose.yml |
| `WA_WEBHOOK_SECRET` | *(Anda generate di VPS)* | Jalankan `openssl rand -hex 32` di terminal VPS, lalu copy hasilnya |

## Langkah-langkah

### Step 1: Generate Webhook Secret di VPS
Jalankan perintah ini di terminal VPS Anda:
```text
openssl rand -hex 32
```
Simpan/copy hasilnya (string 64 karakter hex).

### Step 2: Simpan 3 Secret
Saya akan meminta Anda memasukkan ketiga secret satu per satu melalui dialog di chat.

### Step 3: Konfigurasi Webhook di Evolution API
Setelah secret tersimpan, Anda perlu set webhook URL di Evolution API (via dashboard atau API call) dengan:
- **URL**: `https://jvyklrivwjubuwjdmvfq.supabase.co/functions/v1/wa-webhook`
- **Secret**: Webhook secret yang sama dari Step 1
- **Events**: `messages.upsert`

## Penting

- Webhook URL yang benar: `https://jvyklrivwjubuwjdmvfq.supabase.co/functions/v1/wa-webhook` (BUKAN yang ada typo "u" tambahan)
- Secret `WA_WEBHOOK_SECRET` harus **identik** antara yang disimpan di backend dan yang dikonfigurasi di Evolution API
- Koneksi masih HTTP -- ini aman untuk beta karena traffic hanya VPS-to-Supabase, tapi upgrade ke HTTPS (Nginx reverse proxy + SSL) disarankan sebelum production

