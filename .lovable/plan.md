
Tujuan utama: membuat proses troubleshooting QR WhatsApp menjadi cepat, terukur, dan bisa dijalankan dari dashboard tanpa tebak-tebakan.

Apa yang sudah terverifikasi dari sistem saat ini:
1) Koneksi webhook dari Evolution ke backend aktif.
- Log menunjukkan event berulang: `Connection update: totale_bot connecting`.
- Artinya endpoint webhook menerima callback dari server Evolution.

2) Konfigurasi backend untuk Evolution sudah terisi.
- Setting `evolution_api_url`, `evolution_api_key`, dan `wa_webhook_secret` terdeteksi “set”.

3) Struktur database utama sudah benar untuk multi-instance.
- `wa_sessions` sudah pakai unique komposit `(client_id, instance_name)`.
- Status valid sudah mencakup `connected/disconnected/connecting/error`.
- Jadi blocker lama (constraint) sudah tidak jadi penyebab utama.

4) Kondisi runtime saat ini:
- `wa_sessions` saat ini hanya ada 1 instance (`totale_bot`) dengan `status=disconnected`, `has_qr=false`, dan `last_error` berisi “QR belum tersedia...”.
- Log tidak menunjukkan `qrcode.updated`, hanya `connection.update`.

Analisis akar masalah yang paling mungkin:
A) Event QR tidak diproses konsisten (alias event + bentuk payload QR belum cukup luas).
- Handler webhook saat ini hanya mengecek `event === "qrcode.updated"` dan field QR tertentu.
- Jika Evolution mengirim variasi nama event/payload lain, QR tidak pernah tersimpan.

B) Mapping status pada webhook membuat state “connecting” hilang.
- `connection.update` sekarang diubah jadi:
  - `open` => `connected`
  - selain itu => `disconnected`
- Akibatnya saat Evolution kirim “connecting”, UI dianggap “disconnected”, sehingga alur auto-refresh/recovery jadi kurang natural dan membingungkan.

C) Belum ada “single source of truth” observability.
- Sudah ada Health Check basic, tapi belum ada satu endpoint “Test Semua Koneksi” yang menguji: reachability, webhook per instance, state instance, ketersediaan QR, dan ringkasan rekomendasi tindakan.
- Dashboard belum menampilkan heartbeat terakhir webhook + ringkasan konektivitas operasional lintas instance.

D) Error UX masih kurang actionable di beberapa jalur.
- “Failed to fetch” dari browser/network masih mungkin muncul tanpa klasifikasi cepat (auth timeout, function unavailable, evolution timeout, dns/ssl, dll).

Rencana implementasi (yang akan saya eksekusi setelah Anda approve):

Fase 1 — Hardening backend function untuk diagnosis & QR reliability
1. Perkuat parser event di `wa-webhook`:
- Terima alias event umum: `qrcode.updated`, `QRCODE_UPDATED`, variasi key `event/type`.
- Perluas ekstraksi QR dari beberapa struktur payload (direct, nested, code/base64, dsb).
- Jika event QR diterima tapi QR kosong, tulis reason ringkas ke log operasional.

2. Perbaiki state machine webhook:
- Mapping status lebih akurat:
  - `open/connected` => `connected`
  - `connecting` => `connecting`
  - `close/disconnected` => `disconnected`
  - unknown/error => `error` + `last_error` ringkas
- Ini membuat UI mencerminkan kondisi real dan auto-refresh bekerja sesuai desain.

3. Tambah endpoint diagnostik komprehensif di `manage-wa-instance`:
- `action=diagnostics` (global + per instance), memuat:
  - evolution_reachable + latency estimasi
  - total instance di Evolution
  - webhook configured/enabled/url per instance
  - connection state per instance
  - qr_available per instance (berdasarkan connect/state check aman/read-only semampunya)
  - rekomendasi langkah otomatis (mis. “set-webhook -> restart -> fetch-qr”)

4. Tambah endpoint `action=test-all` (one-click test):
- Menjalankan rangkaian check non-destruktif berurutan.
- Return summary dengan severity (`ok/warn/error`) per komponen.

Fase 2 — Observability data model (ringan, fokus maintenance)
1. Tambah tabel log operasional (mis. `wa_ops_logs`) untuk jejak audit:
- Kolom: timestamp, instance_name, action, status, latency_ms, error_code, error_message, metadata json.
- RLS admin-only (konsisten pola tabel lain).

2. Tambah “heartbeat” webhook:
- Saat webhook menerima event, simpan `last_webhook_event_at` per instance (atau global di settings/log).
- Ini menjawab pertanyaan “service masih nyambung tidak” secara cepat.

Fase 3 — Upgrade UI/UX dashboard operasional
1. Device Manager: panel “Test Semua Koneksi”
- Tombol satu klik untuk panggil `test-all`.
- Menampilkan:
  - Evolution reachable
  - webhook status
  - jumlah connected/connecting/disconnected/error
  - last webhook heartbeat
  - daftar aksi yang direkomendasikan

2. Device Manager: ringkasan KPI yang Anda minta
- Connected clients
- Disconnected clients
- Connecting clients
- Error instances
- Total instance di Evolution vs total di database

3. Device Manager: hasil diagnostik per instance (expandable)
- Status koneksi terakhir
- Webhook state
- Last error
- Last event age
- Tombol aksi cepat: Set Webhook, Restart, Fetch QR, Reconnect Wizard

4. UX error handling yang lebih ramah
- Klasifikasi error:
  - auth/session expired
  - function tidak tersedia
  - Evolution unreachable/timeout
  - instance tidak ditemukan
- Copywriting tindakan jelas (apa yang harus diklik berikutnya).

Fase 4 — Runbook terintegrasi untuk maintenance cepat
1. Alur standar 60 detik:
- Klik “Test Semua Koneksi”
- Jika Evolution unreachable => cek VPS service/network
- Jika webhook invalid => “Perbaiki Webhook”
- Jika state stuck connecting => “Restart + Fetch QR”
- Jika masih gagal => buka detail log instance + export ringkas

2. Idempotent & safe operations:
- Semua aksi recovery aman dijalankan berulang.
- Operasi destruktif tetap confirm dialog + dampak jelas.

Menjawab pertanyaan Anda secara langsung:
- “Ada salah di mana?”
  Kemungkinan bukan di penggunaan Anda. Problem utama saat ini lebih ke reliability operasional (event QR tidak terbaca konsisten + status mapping + observability belum lengkap).

- “API sudah benar/terhubung ke VPS?”
  Indikasi terhubung: webhook menerima event `connection.update` berulang. Jadi jalur koneksi dasar aktif.

- “Bisa tahu info koneksi/ping/status/connected-disconnected di dashboard?”
  Ya, perlu dan bisa. Saya akan satukan lewat panel “Test Semua Koneksi” + KPI status + heartbeat + rekomendasi aksi.

- “Perlu pembaruan UI/UX?”
  Ya, dan ini prioritas tinggi. Fokusnya operational UX (diagnostik + recovery cepat), bukan kosmetik.

File yang akan terdampak saat implementasi:
1) `supabase/functions/wa-webhook/index.ts` (event alias, QR parser, status mapping, heartbeat logging)
2) `supabase/functions/manage-wa-instance/index.ts` (diagnostics + test-all + enriched error model)
3) `supabase/migrations/...` (tabel log operasional + indeks + RLS policy admin-only)
4) `src/pages/admin/DeviceManager.tsx` (panel test-all, KPI status, diagnostic summary, actionable errors)
5) `src/components/admin/InstanceCard.tsx` (detail status instance, per-instance diagnostics, quick actions)

Kriteria sukses:
- QR muncul konsisten pada flow reconnect yang benar.
- Tidak ada kebingungan “sudah nyambung atau belum” karena heartbeat/status jelas.
- Admin bisa mendeteksi sumber masalah dalam 1 layar (<1 menit).
- Troubleshooting jadi repeatable dengan runbook bawaan dashboard.
