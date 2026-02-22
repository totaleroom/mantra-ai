

# Fix Build Error + Access Denied

## Masalah

Ada **2 bug** yang menyebabkan "Access Denied" dan build failure:

### 1. CSP Meta Tag Duplikat di `index.html` (Build Error)
Line 7 berisi **dua meta tag CSP yang digabung jadi satu baris**, menyebabkan HTML parse error. Ini terjadi karena edit sebelumnya menambah CSP baru tanpa menghapus yang lama, sehingga keduanya menyatu.

**Perbaikan:** Ganti line 7 dengan satu meta tag CSP yang benar:
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'self' https://*.lovableproject.com https://*.lovable.app; object-src 'none'; base-uri 'self';" />
```

### 2. Framebusting di `src/main.tsx`
Kode framebusting sudah benar (mengizinkan domain Lovable), jadi setelah build error diperbaiki, preview seharusnya berfungsi normal.

---

## File yang Diubah

| File | Perubahan |
|------|-----------|
| `index.html` | Perbaiki line 7: hapus duplikasi CSP meta tag |

Hanya 1 file, 1 baris yang perlu diperbaiki.

