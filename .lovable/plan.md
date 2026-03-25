

# Plan: Hapus Semua Logika Keamanan yang Bisa Memblokir Preview

## Diagnosis

Preview menampilkan blank putih total — tidak ada console log, tidak ada network request. Ini menunjukkan bahwa app bahkan tidak memulai eksekusi. Logika anti-iframe dan meta security header di `index.html` adalah tersangka utama.

## Perubahan

### 1. `src/main.tsx` — Sederhanakan total
Hapus seluruh fungsi `isAllowedFrame()` dan logika anti-iframe. Buat bootstrap sesederhana mungkin:

```tsx
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import "./index.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
```

### 2. `index.html` — Hapus meta security headers
Hapus baris 8-9:
- `<meta http-equiv="X-Content-Type-Options" content="nosniff" />`
- `<meta name="referrer" content="strict-origin-when-cross-origin" />`

Header ini sudah ada di `nginx.conf` untuk production, tidak perlu duplikasi di HTML.

## File Terdampak
| File | Aksi |
|------|------|
| `src/main.tsx` | Hapus anti-iframe, sederhanakan bootstrap |
| `index.html` | Hapus 2 baris meta security |

## Catatan
- Keamanan production tetap terjaga via `nginx.conf` (CSP, X-Frame-Options, HSTS, dll)
- Anti-iframe bisa ditambahkan kembali nanti setelah preview bekerja normal

