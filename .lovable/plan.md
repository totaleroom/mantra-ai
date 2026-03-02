

# Fix: Login Tidak Bisa Masuk ke Dashboard

## Akar Masalah

Race condition antara `navigate()` dan `onAuthStateChange`:

```text
signIn() sukses
    |
    v
navigate("/admin/clients")  <-- LANGSUNG jalan
    |
    v
ProtectedRoute render
    user = null (belum diupdate)
    isAdmin = false
    loading = false (dari initial getSession)
    |
    v
Redirect ke /login  <-- GAGAL MASUK
    |
    v
onAuthStateChange fire  <-- TERLAMBAT
```

## Solusi

Ubah `Login.tsx` agar TIDAK navigate secara manual. Biarkan `onAuthStateChange` mengupdate context, lalu gunakan `useEffect` untuk navigate setelah `user` dan `isAdmin` tersedia di context.

## Perubahan

### File: `src/pages/Login.tsx`

1. Hapus `navigate("/admin/clients")` dari `handleSubmit`
2. Tambahkan `useEffect` yang watch `user` dan `isAdmin` dari context:
   - Jika `user` ada dan `isAdmin` true → navigate ke `/admin/clients`
   - Ini menjamin navigasi hanya terjadi SETELAH context sudah terupdate

```typescript
// Hapus navigate dari handleSubmit
const handleSubmit = async (e) => {
  // ...
  if (mode === "login") {
    await signIn(email, password);
    // JANGAN navigate di sini
  }
};

// Tambah useEffect untuk auto-navigate
useEffect(() => {
  if (user && isAdmin) {
    navigate("/admin/clients", { replace: true });
  }
}, [user, isAdmin, navigate]);
```

### File: `src/contexts/AuthContext.tsx`

Tidak perlu diubah — logic sudah benar. `onAuthStateChange` akan set `user`, panggil `checkAdmin`, lalu set `loading = false` secara berurutan.

## File yang Terdampak

| File | Perubahan |
|------|-----------|
| `src/pages/Login.tsx` | Hapus navigate manual, tambah useEffect auto-navigate |

## Kriteria Sukses
- Login berhasil dan otomatis masuk ke dashboard
- Tidak ada redirect loop
- Spinner muncul selama proses autentikasi
