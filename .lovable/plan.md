
# Fix QR Code & Webhook - Evolution API v2 Compatibility

## Masalah yang Ditemukan

Dari log edge function, ada 3 bug yang menyebabkan QR tidak muncul dan webhook tidak terpasang:

### 1. Format webhook salah (penyebab utama)
Log: `"instance requires property \"webhook\""`

Kode saat ini menggunakan field `webhook_by_events` dan `webhook_base64` (format lama), tapi Evolution API v2 menggunakan `enabled`, `webhookByEvents`, `webhookBase64` (camelCase).

**Payload saat ini (SALAH):**
```text
{
  url: "...",
  webhook_by_events: false,
  webhook_base64: true,
  headers: { ... },
  events: [...]
}
```

**Payload yang benar (Evolution API v2):**
```text
{
  enabled: true,
  url: "...",
  webhookByEvents: false,
  webhookBase64: true,
  headers: { ... },
  events: [...]
}
```

### 2. URL encoding untuk nama instance dengan spasi
Log: `Cannot PUT /instance/restart/Totale%20Bot`

Instance bernama "Totale Bot" (dengan spasi) menyebabkan error di beberapa endpoint. Semua URL perlu di-encode dengan `encodeURIComponent()`.

### 3. QR code null setelah sync
Setelah sync, `qr_code` disimpan sebagai `null`. Tombol "Fetch QR" memanggil `connect` action yang sudah benar, tapi perlu dipastikan response dari Evolution API diparse dengan tepat.

## Perubahan

### File: `supabase/functions/manage-wa-instance/index.ts`

1. **Fix webhook payload** di action `sync` dan `create`:
   - Tambah field `enabled: true`
   - Ganti `webhook_by_events` menjadi `webhookByEvents`
   - Ganti `webhook_base64` menjadi `webhookBase64`

2. **Fix URL encoding** di semua endpoint:
   - Gunakan `encodeURIComponent(instance_name)` untuk semua URL path yang mengandung nama instance
   - Berlaku untuk: connect, restart, logout, delete, webhook/set, webhook/find

3. **Tidak ada perubahan UI** -- InstanceCard dan DeviceManager sudah benar, masalahnya murni di edge function.

## Alur setelah fix
1. Deploy edge function yang sudah diperbaiki
2. Buka `/admin/devices`, pilih client, klik "Sync dari VPS"
3. Webhook akan berhasil terpasang (tidak ada error `400` lagi)
4. Klik "Fetch QR" di instance -- QR code muncul
5. Scan QR -- status berubah ke "Connected" via webhook realtime

## Yang perlu dipastikan di VPS
- Pastikan port 8080 terbuka: `sudo ufw status` (cek 8080 ada di list)
- Pastikan container jalan: `docker ps` (evolution-api harus "Up")
- Tidak perlu konfigurasi tambahan di VPS -- semua fix ada di edge function
