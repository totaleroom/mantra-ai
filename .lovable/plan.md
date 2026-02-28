
Tujuan: menyelesaikan masalah QR yang belum muncul, memastikan proses reconnect/delete lebih stabil, dan meningkatkan UI/UX dashboard agar troubleshooting bisa cepat tanpa tebak-tebakan.

Kondisi yang sudah terverifikasi dari sistem saat ini (berdasarkan kode + log):
1) Evolution service kemungkinan besar aktif
- Ada banyak event masuk ke backend function webhook: `Connection update: totale_bot connecting`.
- Artinya server Evolution masih mengirim callback ke backend.

2) Webhook sudah “hidup”, tapi QR event tidak terlihat
- Log webhook menunjukkan event `connection.update` berulang, tetapi tidak ada log `qrcode.updated`.
- Ini indikasi utama kenapa UI tidak menampilkan QR.

3) Struktur database masih membatasi multi-instance per client
- Tabel `wa_sessions` masih punya constraint `UNIQUE (client_id)`.
- Ini bertentangan dengan UI yang sudah didesain multi-instance; risiko sync/create gagal untuk instance ke-2, ke-3.

4) Ada mismatch format payload webhook antar endpoint/versi Evolution
- Di `manage-wa-instance`, payload webhook di action `create` masih format lama (`byEvents`, `base64` di objek nested `webhook`).
- Sementara di action `sync` memakai format camelCase untuk endpoint `/webhook/set/{instance}`.
- Log historis menunjukkan error `instance requires property "webhook"` saat set webhook; jadi perlu kompatibilitas dua format payload.

5) UX troubleshooting masih belum cukup “operasional”
- User belum dapat satu layar yang menjawab cepat:
  - “Evolution aktif atau tidak?”
  - “Webhook nyambung atau tidak?”
  - “QR kenapa belum keluar?”
  - “Langkah reconnect selanjutnya apa?”

Rencana implementasi yang saya sarankan:

Fase 1 — Stabilkan fondasi data & lifecycle instance
1. Ubah constraint multi-instance (database migration)
- Drop unique lama: `wa_sessions_client_id_key`.
- Ganti dengan unique komposit: `(client_id, instance_name)` agar satu client bisa punya banyak instance.
- Tambah index operasional:
  - `(client_id, updated_at desc)`
  - `(instance_name)`

2. Rapikan status machine
- Status yang dipakai konsisten: `disconnected | connecting | connected | error`.
- Semua action (`create`, `sync`, `connect`, `restart`, `logout`, `delete`) mengisi status secara deterministik.
- Tambah `last_error` opsional (text) agar penyebab gagal tampil di dashboard (tidak cuma “failed to fetch”).

Fase 2 — Hardening backend function untuk reconnect & QR
1. Normalisasi webhook configuration (kompatibilitas Evolution)
- Buat helper `setWebhookWithFallback(instanceName)`:
  - Coba payload format A (camelCase flat).
  - Jika gagal dengan error schema tertentu, fallback ke payload format B (nested `webhook`).
- Simpan hasil attempt + response singkat ke log backend (structured log).

2. Perbaiki action `create` agar format webhook konsisten dengan fallback yang sama
- Hindari mismatch antar `create` vs `sync`.

3. Perkuat action `connect`
- Parsing QR multi-bentuk response:
  - `code`
  - `base64`
  - `qrcode.code`
  - `qrcode.base64`
- Jika QR null:
  - cek connection state endpoint,
  - jika masih `connecting`, trigger retry terkontrol (short retry + backoff),
  - jika tetap null, return error manusiawi + saran tindakan.

4. Tambah action diagnosis cepat
- `action=health-check` mengembalikan:
  - evolution_reachable (true/false)
  - fetch_instances_ok
  - webhook_find_ok per instance (jika tersedia endpoint)
  - last webhook event timestamp yang diketahui
  - reason ringkas jika gagal
- Ini jadi fondasi UI “status kesehatan”.

Fase 3 — Dashboard UX yang user-friendly untuk maintenance cepat
1. Tambah panel “Kesehatan Integrasi” di Device Manager
- Badge hijau/kuning/merah:
  - Evolution API reachable
  - Webhook configured
  - Last event age (mis. “30 detik lalu”)
  - QR readiness

2. Tambah wizard “Reconnect Cepat” per instance
- Step-by-step tombol:
  1) Cek koneksi Evolution
  2) Set/Uji webhook
  3) Restart instance
  4) Ambil QR ulang
- Setiap step menampilkan hasil jelas (OK/Gagal + alasan).

3. Perbaiki pesan error menjadi tindakan konkret
- Dari “Failed to fetch” menjadi:
  - “Server Evolution tidak bisa diakses”
  - “Webhook belum terpasang”
  - “Instance terkunci di status connecting”
  - “Instance tidak ditemukan di VPS”
- Sertakan CTA langsung: “Coba Reconnect Wizard”, “Lihat Diagnostik”, “Sync Ulang”.

4. Tambah auto-refresh QR yang aman
- Saat status `connecting`, auto-refresh terbatas (mis. tiap 10 detik, max 6x) dengan countdown.
- Tombol manual tetap ada.

Fase 4 — Mitigasi risiko operasional
1. Idempotent operations
- `delete-all`, `sync`, `set-webhook` harus aman dijalankan berulang.
- Operasi gagal sebagian tidak membuat state membingungkan.

2. Retry policy
- Retry hanya untuk network/transient error, bukan semua error.
- Backoff ringan dan berhenti dengan error terjelas.

3. Operational logging minimal
- Simpan log ringkas per aksi (instance, action, status, error, latency) agar root-cause cepat.

4. Guardrail admin
- Semua aksi destruktif tetap pakai konfirmasi + detail dampak.
- Tombol “Hapus Semua” tampilkan jumlah instance target sebelum eksekusi.

Runbook maintenance (yang nanti ditanam di UI “Bantuan Cepat”):
1) Klik “Health Check”
2) Jika Evolution unreachable → cek service VPS/network
3) Jika webhook invalid → klik “Perbaiki Webhook”
4) Jika status stuck `connecting` > 2 menit → “Restart + Fetch QR”
5) Jika QR tetap null → jalankan “Reconnect Wizard”
6) Jika masih gagal → tampilkan detail error + ekspor log teknis singkat

Menjawab pertanyaan Anda secara langsung:
- “Apakah saya melakukan kesalahan?”  
  Kemungkinan besar bukan kesalahan penggunaan. Dari data saat ini, masalah lebih ke reliability arsitektur (format payload webhook, constraint multi-instance, dan kurangnya alur diagnosis otomatis).
- “Apakah Evolution aktif?”  
  Indikasinya aktif karena event `connection.update` terus masuk.
- “Perlu pembaruan UI/UX?”  
  Ya, sangat perlu. Fokusnya bukan kosmetik, tapi “operational UX” supaya proses recovery bisa cepat, jelas, dan repeatable.

File yang akan terdampak saat implementasi (setelah Anda approve eksekusi):
1) `supabase/migrations/...` (constraint multi-instance + index)
2) `supabase/functions/manage-wa-instance/index.ts` (health-check, reconnect flow, payload fallback, error model)
3) `src/pages/admin/DeviceManager.tsx` (health panel, reconnect wizard, better errors, auto-refresh QR)
4) `src/components/admin/InstanceCard.tsx` (status detail + guided reconnect actions)
5) opsional: tabel log operasional jika Anda setuju menambah jejak audit troubleshooting

Kriteria sukses:
- User bisa melihat daftar instance dengan benar (multi-instance stabil).
- QR muncul konsisten saat reconnect.
- Error tidak lagi generik “failed to fetch”.
- Admin bisa menyelesaikan mayoritas insiden dari dashboard tanpa akses manual ke VPS.
