

# Plan: Production-Ready Clone & VPS Deployment Files

## Tujuan
Menambahkan file-file yang diperlukan agar repository bisa di-clone ke VPS dan langsung production-ready, tanpa menghapus atau mengubah file existing.

## File yang Akan Ditambahkan

### 1. `.env.example`
Template environment variables yang dibutuhkan. User tinggal copy ke `.env` dan isi nilainya.

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

### 2. `docker-compose.yml`
Docker Compose untuk deploy frontend (Nginx) + Evolution API di VPS. Opsional: container WWeb.js (Plan B).

Berisi:
- Service `frontend`: build dari Dockerfile, serve `dist/` via Nginx
- Service `evolution-api`: image Evolution API official
- Service `wwebjs` (opsional, commented out): Node.js WWeb.js microservice
- Network shared

### 3. `Dockerfile`
Multi-stage build: stage 1 = build Vite app, stage 2 = serve via Nginx.

### 4. `nginx.conf`
Konfigurasi Nginx untuk SPA (try_files, gzip, security headers, cache static assets). Dipakai di Docker container.

### 5. `deploy.sh`
Script deployment otomatis:
- Pull latest dari Git
- Build frontend
- Restart containers
- Health check

## File yang TIDAK diubah
- Semua source code existing
- Edge functions (tetap di Lovable Cloud)
- `.gitignore` (sudah benar)

## Catatan Arsitektur untuk AstrBot

Jika Anda ingin menggunakan AstrBot sebagai AI engine (menggantikan Lovable AI gateway), itu butuh perubahan di edge function `wa-webhook`. Ini bisa jadi fase terpisah setelah deployment dasar berhasil.

