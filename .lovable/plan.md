
# Admin Setup + Security Hardening — Mantra AI

## 1. Tambah Admin (totale.room@gmail.com)

Email `totale.room@gmail.com` belum terdaftar di database. Anda perlu **signup dulu** melalui halaman `/login` (atau kita bisa buatkan tombol signup). Setelah signup berhasil, saya akan insert role admin ke tabel `user_roles`.

**Langkah:**
1. Tambah fitur signup di halaman Login (toggle Login/Register)
2. Setelah Anda signup, saya insert `user_roles` record dengan role `admin`
3. Atau alternatif: saya langsung buat akun via SQL dan insert admin role sekaligus

**Rekomendasi:** Saya akan menambah toggle Register di halaman Login agar Anda bisa signup langsung. Setelah itu saya insert admin role.

---

## 2. Security Enhancements (Yang Berlaku untuk Project Ini)

Dari audit keamanan yang Anda berikan, berikut yang **relevan dan bisa diterapkan** di project Mantra ini:

### 2a. Content Security Policy (CSP) di `index.html`

Tambah meta tag CSP untuk memblokir:
- Script injection dari domain luar (iklan judi, malware)
- Cache poisoning
- Clickjacking via iframe

```text
CSP directives:
- default-src 'self'
- script-src 'self' 'unsafe-inline'
- style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
- font-src 'self' https://fonts.gstatic.com
- img-src 'self' data: https: blob:
- connect-src 'self' https://*.supabase.co
- frame-src 'none'
- object-src 'none'
- base-uri 'self'
```

### 2b. Security Headers di `index.html`

- `X-Content-Type-Options: nosniff` — cegah MIME sniffing
- `X-Frame-Options: DENY` — cegah embedding di iframe
- `Referrer-Policy: strict-origin-when-cross-origin` — batasi referrer info

### 2c. Anti-Iframe Framebusting di `src/main.tsx`

Deteksi jika app di-load di dalam iframe (framing attack) dan blokir.

### 2d. Honeypot Anti-Bot di Form Login

Tambah hidden field di form login. Bot akan mengisi field ini, user asli tidak. Jika terisi, tolak submit. Ini alternatif CAPTCHA tanpa mengganggu UX.

### 2e. Input Validation dengan Zod di Login Form

Tambah validasi Zod untuk email dan password sebelum kirim ke backend.

---

## 3. Yang TIDAK Relevan (Skip)

Item dari audit sebelumnya yang **tidak berlaku** untuk project ini:

| Item | Alasan Skip |
|------|-------------|
| Rate limit edge functions | Belum ada edge function di project ini (akan dibuat nanti di Phase Knowledge Base) |
| `analyze-cv`, `validate-license`, dll | Fungsi-fungsi ini dari project lain, tidak ada di Mantra |
| DOMPurify di ModuleReader | Tidak ada ModuleReader di project ini |
| CAPTCHA | Honeypot sudah cukup untuk admin-only login |

Rate limiting akan diterapkan nanti saat edge functions `process-document` dan `test-rag` dibuat.

---

## File yang Diubah

| File | Perubahan |
|------|-----------|
| `index.html` | CSP meta tag, X-Content-Type-Options, X-Frame-Options, Referrer-Policy |
| `src/main.tsx` | Anti-iframe framebusting script |
| `src/pages/Login.tsx` | Honeypot field, Zod validation, toggle Register/Login |
| `src/hooks/useAuth.ts` | Tambah fungsi `signUp` |

---

## Detail Teknis

### Login.tsx — Perubahan

1. **Honeypot field**: Hidden input `name="website"` yang tidak terlihat user
2. **Zod validation**: Schema validasi email (valid format) + password (min 6 char)
3. **Toggle mode**: Tombol switch antara "Masuk" dan "Daftar"
4. **SignUp flow**: Memanggil `supabase.auth.signUp()` lalu tampilkan pesan "Cek email untuk verifikasi"

### useAuth.ts — Tambah signUp

```typescript
const signUp = async (email: string, password: string) => {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
};
```

### main.tsx — Framebusting

```typescript
if (window.top !== window.self) {
  document.body.innerHTML = '<h1>Access Denied</h1>';
}
```

### Admin Role Insert

Setelah Anda signup dan verifikasi email, saya akan menjalankan:
```sql
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users
WHERE email = 'totale.room@gmail.com';
```

---

## Urutan Implementasi

1. Update `index.html` dengan security headers + CSP
2. Update `src/main.tsx` dengan anti-iframe
3. Update `src/pages/Login.tsx` dengan honeypot + Zod + signup toggle
4. Update `src/hooks/useAuth.ts` dengan signUp function
5. Anda signup via form baru
6. Insert admin role ke database
