

# Fix: Preview Tidak Tampil Karena CSP Terlalu Ketat

## Akar Masalah

File `index.html` baris 7 memiliki Content Security Policy yang membatasi `script-src` hanya ke `'self' 'unsafe-inline'`. Lovable preview membutuhkan koneksi ke domain tambahan (untuk HMR, tagger, dll) yang diblokir oleh CSP ini.

## Solusi

Pindahkan CSP dari `index.html` ke `nginx.conf` saja (untuk production). Dengan begitu:
- **Di Lovable preview** (development): tidak ada CSP yang memblokir → preview berjalan normal
- **Di VPS production** (via Nginx): CSP tetap aktif dan melindungi

## Perubahan

### File: `index.html`
- **Hapus** baris meta CSP (`<meta http-equiv="Content-Security-Policy" ...>`)

### File: `nginx.conf`
- **Tambah** header CSP yang sama sebagai response header Nginx (sudah ada security headers lain di sana)

Ini adalah best practice: CSP di level web server, bukan di HTML meta tag, karena lebih fleksibel dan bisa di-override per environment.

## File Terdampak
| File | Aksi |
|------|------|
| `index.html` | Hapus 1 baris meta CSP |
| `nginx.conf` | Tambah `add_header Content-Security-Policy` |

