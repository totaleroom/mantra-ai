# MANTRA AI — Asisten Digital untuk UMKM Indonesia

> Platform asisten digital berbasis AI yang membantu UMKM Indonesia mengotomasi customer service WhatsApp, manajemen stok, dan marketing — sehingga pemilik bisnis bisa fokus mengembangkan usaha.

---

## 📖 Panduan Penggunaan Platform

### 1. Login sebagai Admin

1. Buka halaman `/login`
2. Masukkan email dan password akun admin yang sudah terdaftar
3. Setelah login berhasil, Anda akan diarahkan ke dashboard admin
4. Jika belum punya akun, hubungi admin utama untuk didaftarkan

### 2. Mengelola Client

**Lokasi:** Dashboard → **Clients** (`/admin/clients`)

- **Tambah Client**: Klik tombol "Tambah Client", isi nama, industri, dan paket langganan
- **Edit Client**: Klik ikon edit pada baris client untuk mengubah data
- **Hapus Client**: Klik ikon hapus, konfirmasi penghapusan
- **Filter & Cari**: Gunakan kolom pencarian untuk menemukan client berdasarkan nama
- **Custom Prompt**: Atur system prompt AI per-client via menu dropdown
- Setiap client memiliki quota pesan yang bisa diatur sesuai paket langganan

### 3. Menghubungkan WhatsApp Device

**Lokasi:** Dashboard → **Device & Connection** (`/admin/devices`)

1. Pilih client yang ingin dihubungkan
2. Klik "Buat Instance" — sistem akan menampilkan QR Code
3. Buka WhatsApp di HP → Settings → Linked Devices → Link a Device
4. Scan QR Code yang ditampilkan di dashboard
5. Status akan berubah menjadi "Connected" setelah berhasil
6. Bot AI akan otomatis membalas pesan masuk sesuai knowledge base

**Fitur Tambahan:**
- **Test Semua Koneksi**: Cek health Evolution API, webhook, database, dan heartbeat dalam 1 klik
- **Diagnostik Detail**: Lihat status per-instance (VPS vs DB), konfigurasi webhook, dan rekomendasi
- **Diagnostik 2 Arah**: Verifikasi bahwa webhook bisa menerima event dari VPS (inbound verification)
- **Reconnect Wizard**: Langkah-langkah guided (perbaiki webhook → restart → ambil QR) untuk instance bermasalah
- **Sync dari VPS**: Import instance yang sudah ada di Evolution API server

### 4. Upload Knowledge Base

**Lokasi:** Dashboard → **Knowledge Base** (`/admin/knowledge`)

1. Pilih client yang ingin ditambahkan knowledge base
2. Klik "Upload Document"
3. Pilih file PDF atau TXT yang berisi informasi produk/layanan
4. Sistem akan memproses dan memecah dokumen menjadi chunks
5. Setelah status "Processed", bot sudah bisa menjawab pertanyaan berdasarkan dokumen
6. Anda bisa upload multiple dokumen untuk satu client
7. Atur **Role Tag** (gudang/owner) untuk memfilter konteks RAG

### 5. Monitoring Pesan & Billing

**Lokasi:** Dashboard → **Monitoring** (`/admin/monitoring`)

- **Message Logs**: Lihat jumlah pesan per hari per client
- **Token Usage**: Pantau penggunaan token AI
- **Billing Alerts**: Notifikasi otomatis saat quota client hampir habis
- **Statistik**: Grafik penggunaan harian/mingguan

### 6. Test Bot Response (RAG)

**Lokasi:** Dashboard → **Knowledge Base** → tombol "Test Bot"

1. Pilih client yang sudah memiliki knowledge base
2. Ketik pertanyaan di kolom test
3. Bot akan menjawab berdasarkan dokumen yang sudah di-upload
4. Gunakan fitur ini untuk memastikan jawaban bot sesuai sebelum go-live

### 7. Inbox — Live Chat

**Lokasi:** Dashboard → **Inbox** (`/admin/inbox`)

- Lihat percakapan yang di-eskalasi ke admin (HUMAN handover)
- Balas langsung dari dashboard tanpa perlu buka WhatsApp
- Badge notifikasi di sidebar menunjukkan jumlah eskalasi aktif

---

## 🏗️ Arsitektur

```
┌─────────────────────┐
│   Frontend (SPA)    │  React + Vite + TypeScript + Tailwind CSS
│   Code-Split Lazy   │  → dist/ folder (per-page chunks)
└────────┬────────────┘
         │ HTTPS
┌────────▼────────────┐
│   Lovable Cloud     │  Authentication, Database, Edge Functions
│   (Backend)         │  Real-time subscriptions, File storage
└────────┬────────────┘
         │
┌────────▼────────────┐
│   Evolution API     │  WhatsApp Business via QR pairing
│   (VPS)             │  Webhook → Edge Function → AI → Reply
└─────────────────────┘
```

- **Frontend**: React 18 SPA dengan Vite, Tailwind CSS, shadcn/ui
- **Code Splitting**: `React.lazy()` + `Suspense` untuk semua halaman admin & login
- **Landing Optimization**: Komponen berat (Calculator, ChatDemo, FAQ) di-lazy via IntersectionObserver
- **Backend**: Lovable Cloud (authentication, PostgreSQL database, edge functions)
- **State Management**: TanStack React Query dengan konfigurasi global (retry:1, staleTime:30s)
- **Error Handling**: React Error Boundary di AdminLayout mencegah crash propagasi
- **Routing**: React Router v6

---

## 📁 Struktur Folder

```
├── public/                 # Static assets (favicon, robots.txt, sitemap.xml)
├── src/
│   ├── assets/             # Gambar & media (imported via ES6)
│   ├── components/
│   │   ├── admin/          # Komponen dashboard admin (AdminLayout, InstanceCard, dll)
│   │   ├── landing/        # Komponen landing page (LazySection, ChatDemo, dll)
│   │   └── ui/             # shadcn/ui components
│   ├── hooks/              # Custom React hooks (useAuth, useAdminData, useMobile)
│   ├── integrations/       # Backend client & types (auto-generated)
│   ├── lib/                # Utility functions
│   ├── pages/              # Route pages
│   │   └── admin/          # Halaman dashboard admin
│   └── test/               # Test setup & files
├── supabase/
│   ├── config.toml         # Backend configuration (auto-managed)
│   ├── functions/          # Edge functions (auto-deployed)
│   │   ├── manage-wa-instance/  # CRUD instance + test-all + diagnostics
│   │   ├── wa-webhook/          # Inbound webhook handler + AI reply + diagnostic ping
│   │   ├── process-document/    # Chunking & embedding
│   │   ├── test-rag/            # RAG testing endpoint
│   │   ├── manage-settings/     # Platform settings CRUD
│   │   ├── manage-admin/        # Admin user management
│   │   └── wa-send-message/     # Outbound WA message
│   └── migrations/         # Database migrations
├── index.html              # Entry point + SEO meta tags
├── tailwind.config.ts      # Tailwind configuration
└── vite.config.ts          # Vite build configuration
```

---

## 🚀 Development Lokal

### Prasyarat

- Node.js >= 18 (disarankan menggunakan [nvm](https://github.com/nvm-sh/nvm))
- npm atau bun

### Langkah-langkah

```bash
# 1. Clone repository
git clone <YOUR_GIT_URL>
cd mantra-admin-id

# 2. Install dependencies
npm install

# 3. Setup environment variables
# File .env sudah otomatis ter-generate oleh Lovable Cloud
# Jika development lokal, buat file .env dengan:
cp .env.example .env
# Isi variabel yang diperlukan (lihat bagian Environment Variables)

# 4. Jalankan development server
npm run dev

# 5. Build untuk production
npm run build

# 6. Preview production build
npm run preview
```

---

## 🌐 Deployment ke VPS

### Prasyarat VPS

- Ubuntu 20.04+ / Debian 11+
- Nginx
- Node.js >= 18
- SSL certificate (Let's Encrypt / Certbot)

### Langkah 1: Build Aplikasi

```bash
npm run build
# Output ada di folder dist/
```

### Langkah 2: Upload ke VPS

```bash
scp -r dist/ user@your-vps-ip:/var/www/mantra-ai/
```

### Langkah 3: Konfigurasi Nginx

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    root /var/www/mantra-ai;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|otf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location ~ /\. {
        deny all;
    }
}
```

### Langkah 4: Setup SSL

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Langkah 5: Restart Nginx

```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔐 Environment Variables

| Variable | Deskripsi | Wajib |
|----------|-----------|-------|
| `VITE_SUPABASE_URL` | URL backend (otomatis dari Lovable Cloud) | ✅ |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public API key (otomatis) | ✅ |

> **Catatan**: Saat menggunakan Lovable Cloud, semua environment variables sudah otomatis dikonfigurasi.

---

## 📊 Fitur Utama

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| **Landing Page** | Halaman marketing dengan SEO, JSON-LD structured data | ✅ Ready |
| **Admin Dashboard** | Manajemen klien, device, knowledge base, monitoring | ✅ Ready |
| **Authentication** | Login/register dengan email verification | ✅ Ready |
| **Role-Based Access** | Hanya admin yang bisa mengakses dashboard | ✅ Ready |
| **Anti-Bot** | Honeypot field pada form login/register | ✅ Ready |
| **SEO** | Meta tags, Open Graph, sitemap.xml, robots.txt | ✅ Ready |
| **WhatsApp Integration** | QR code pairing, session management | ✅ Ready |
| **Knowledge Base (RAG)** | Upload PDF/TXT, chunking, embedding, role tags | ✅ Ready |
| **Monitoring** | Message logs, token usage, billing alerts | ✅ Ready |
| **Test Bot** | Test response RAG sebelum go-live | ✅ Ready |
| **Inbox / Live Chat** | Balas eskalasi langsung dari dashboard | ✅ Ready |
| **Diagnostik 2 Arah** | Test koneksi Dashboard↔VPS secara bidirectional | ✅ Ready |
| **Health Check** | Cek Evolution API, webhook, heartbeat, database | ✅ Ready |
| **Reconnect Wizard** | Guided steps untuk recovery instance bermasalah | ✅ Ready |
| **Ops Logs** | Audit trail semua operasi instance (wa_ops_logs) | ✅ Ready |
| **Code Splitting** | Lazy-load halaman admin & komponen berat landing | ✅ Ready |
| **Error Boundary** | Crash isolation per halaman admin | ✅ Ready |
| **System Snapshot** | API endpoint JSON status sistem untuk integrasi AI chatbot | ✅ Ready |

---

## 📝 Changelog

### v3.0.0 (2026-03-02)
- **Performance**: Code splitting dengan React.lazy untuk semua halaman admin
- **Performance**: Lazy-load komponen landing berat (ChatDemo, Calculator, FAQ) via IntersectionObserver
- **Stability**: QueryClient default config (retry:1, staleTime:30s, no refetchOnWindowFocus)
- **Stability**: DeviceManager migrasi ke React Query + realtime invalidation
- **Stability**: Error Boundary di AdminLayout mencegah crash propagasi
- **Stability**: Fix InstanceCard useEffect dependency array & cleanup
- **Bridge**: Standarisasi pemanggilan edge function via VITE_SUPABASE_URL
- **Docs**: README diperbarui dengan semua fitur terbaru

### v2.5.0
- Diagnostik 2 arah (inbound webhook verification)
- Reconnect Wizard untuk instance bermasalah
- Ops Logs (wa_ops_logs) untuk audit trail

### v2.4.0
- Inbox live chat dengan eskalasi HUMAN
- Custom prompt per-client
- Role tag pada knowledge base

---

## 🔒 Keamanan

- **RLS (Row Level Security)** aktif di semua tabel, dibatasi ke `authenticated` role
- **Admin-only access** menggunakan fungsi `is_admin()` (security definer)
- **Honeypot** anti-bot pada form login
- **Input validation** menggunakan Zod schema
- **Email verification** wajib sebelum bisa login
- **Webhook secret** untuk verifikasi event WhatsApp

---

## 🤖 Integrasi AstrBot

### Prasyarat

- VPS Debian 12+ dengan Docker
- AstrBot terinstall (`soulter/astrbot:latest`)

### Setup

1. **Install AstrBot**:
   ```bash
   docker run -d --name astrbot -p 6185:6185 \
     -v /opt/astrbot/data:/AstrBot/data \
     --restart unless-stopped soulter/astrbot:latest
   ```

2. **Endpoint System Snapshot**:
   ```
   GET https://<SUPABASE_URL>/functions/v1/system-snapshot
   Headers: Authorization: Bearer <admin-jwt-token>
   ```

3. **Konfigurasi tool di AstrBot** — buat tool `check_mantra_status` yang memanggil endpoint di atas.

4. **System prompt untuk AstrBot**:
   ```
   Kamu adalah asisten teknis untuk platform MANTRA AI.
   Gunakan tool check_mantra_status untuk melihat kondisi sistem terkini.
   Bantu admin mendiagnosa masalah WhatsApp, koneksi, dan quota.
   ```

### Catatan Model

| Model | VRAM/RAM | Cocok untuk VPS 4GB? |
|-------|----------|---------------------|
| Qwen3 235B A22B | ~50GB+ | ❌ Pakai API cloud |
| Qwen3.5-Flash | ~8-16GB | ⚠️ Mepet |
| Qwen3-8B | ~5-6GB | ✅ Via Ollama |
| Qwen3-4B | ~3GB | ✅ Ringan |

---

## 🤝 Kontribusi

1. Fork repository ini
2. Buat branch fitur: `git checkout -b fitur/nama-fitur`
3. Commit perubahan: `git commit -m "Tambah fitur X"`
4. Push ke branch: `git push origin fitur/nama-fitur`
5. Buat Pull Request

---

## 📄 Lisensi

© 2026 Mantra AI. All rights reserved.

---

## 📞 Kontak

- **Email**: hello00mantra@gmail.com
- **Instagram**: [@hiimantra](https://instagram.com/hiimantra)
- **WhatsApp**: [+62 821-2508-6328](https://wa.me/6282125086328)
