

# Audit & Hardening Setup MANTRA AI + Evolution API

## Status Saat Ini (Hasil Audit)

### Yang Sudah Benar
| Item | Status |
|------|--------|
| Secrets (EVOLUTION_API_URL, EVOLUTION_API_KEY, WA_WEBHOOK_SECRET) | Tersimpan di backend + platform_settings |
| Test Connection dari dashboard | Sukses ("0 instance" = normal, belum ada instance) |
| Edge function wa-webhook | Lengkap: parse message, RAG search, AI reply via Lovable AI Gateway, eskalasi |
| Edge function wa-send-message | Lengkap: kirim via Evolution API + typing indicator + anti-ban delay |
| Client "Totale.Room" | Ada di database, status active, quota 1000 |
| AI model default | google/gemini-2.5-flash-lite via Lovable AI Gateway (GRATIS, tidak perlu Groq) |

### Masalah yang Ditemukan

| # | Masalah | Dampak |
|---|---------|--------|
| 1 | **Tabel `wa_sessions` kosong** - instance "mantra-bot-1" belum terdaftar di database | Dashboard Device Manager tidak bisa tampilkan QR, webhook gagal cari client_id |
| 2 | **DeviceManager tidak bisa CREATE instance baru** - hanya read/restart/delete, tidak ada tombol "Buat Instance" | Admin tidak bisa menambah instance WA dari dashboard |
| 3 | **Webhook URL di pesan Anda ada typo** - `wujubuwjdmvfq` seharusnya `wjubuwjdmvfq` | Webhook dari Evolution API akan gagal 404 |
| 4 | **Webhook secret berbeda** - di platform_settings: `2999f146...`, tapi di pesan Anda disebut placeholder | Jika secret di Evolution API tidak match, webhook ditolak 403 |
| 5 | **HTTP tanpa HTTPS** untuk Evolution API URL | Aman untuk beta (server-to-server), tapi Evolution webhook callback ke Supabase sudah HTTPS |

## Rencana Perbaikan

### 1. Tambah Fitur "Create Instance" di DeviceManager
Menambahkan tombol dan logic untuk membuat instance WA baru via Evolution API langsung dari dashboard:

- Tambah tombol "Buat Instance" di DeviceManager
- Buat edge function baru `manage-wa-instance` yang:
  - POST ke Evolution API `/instance/create` dengan nama instance + webhook config
  - Otomatis set webhook URL + secret di instance yang baru dibuat
  - Insert row ke `wa_sessions` dengan status "connecting"
  - Return QR code untuk di-scan
- Tambah action "Fetch QR" yang memanggil Evolution API `/instance/connect/{instance}` dan update `qr_code` di `wa_sessions`

### 2. Edge Function `manage-wa-instance`
Endpoint baru yang menangani lifecycle instance:
- **POST** `action=create`: Buat instance di Evolution API + set webhook + insert wa_sessions
- **POST** `action=connect`: Request QR code dari instance
- **POST** `action=restart`: Restart instance connection
- **DELETE**: Hapus instance dari Evolution API + hapus wa_sessions row

Webhook config yang akan di-set otomatis saat create:
```text
URL: https://jvyklrivwjubuwjdmvfq.supabase.co/functions/v1/wa-webhook
Events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"]
Secret header: X-Webhook-Secret = (dari platform_settings)
```

### 3. Handle Webhook Events Tambahan di wa-webhook
Tambah handling untuk:
- `connection.update`: Update status di `wa_sessions` (connected/disconnected)
- `qrcode.updated`: Update `qr_code` di `wa_sessions` agar dashboard realtime tampilkan QR terbaru

### 4. Panduan Setup VPS (Tidak Perlu Perubahan Kode)

**Docker survive reboot:**
Docker Compose dengan `restart: unless-stopped` sudah cukup. Pastikan Docker daemon auto-start:
```text
sudo systemctl enable docker
```

**Backup PostgreSQL & Redis:**
Tambahkan cron job sederhana di VPS:
```text
# Backup PostgreSQL Evolution setiap hari jam 3 pagi
0 3 * * * docker exec evolution-postgres pg_dump -U postgres evolution > ~/backups/evolution_$(date +%F).sql

# Backup Redis
0 3 * * * docker exec evolution-redis redis-cli SAVE && docker cp evolution-redis:/data/dump.rdb ~/backups/redis_$(date +%F).rdb
```

**Monitoring VPS:**
Install Netdata (1-line install):
```text
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
# Akses di http://147.93.152.59:19999
```

### 5. Tentang AI Model
Anda **tidak perlu** API Key Groq/Gemini terpisah. MANTRA AI sudah menggunakan **Lovable AI Gateway** yang include Gemini 2.5 Flash Lite, Flash, Pro, dan GPT-5. Semua bisa di-switch dari halaman Settings > AI Configuration tanpa tambahan API key.

### 6. Scale untuk Multi-Client
VPS 8GB cukup untuk 10+ instance WA. Setiap instance Evolution API menggunakan ~50-100MB RAM. Dengan 10 instance: ~1GB untuk Evolution + ~500MB PostgreSQL + ~200MB Redis = ~1.7GB. Masih sisa ~6GB.

## Detail Teknis (Urutan Implementasi)

1. Buat edge function `manage-wa-instance/index.ts`
2. Tambah config di `supabase/config.toml` (verify_jwt = false)
3. Update `DeviceManager.tsx` - tambah tombol Create Instance + Connect + handle QR
4. Update `wa-webhook/index.ts` - handle event `connection.update` dan `qrcode.updated`
5. Deploy dan test end-to-end

