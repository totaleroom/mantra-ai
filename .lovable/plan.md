

# Fix: Knowledge Base Blank Screen

## Penyebab

Radix UI `Select` component tidak mendukung `value=""` (empty string) pada `SelectItem`. Ini menyebabkan error runtime yang membuat seluruh halaman crash ke blank screen.

Lokasi masalah di `src/pages/admin/KnowledgeBase.tsx`:
- Baris 47: `useState<string>("")` -- initial value adalah empty string
- Baris 161: `<SelectItem value="">Semua Role</SelectItem>` -- value kosong tidak valid

## Solusi

Ganti empty string `""` dengan sentinel value `"none"` untuk role tag:

1. **Baris 47**: Ubah `useState<string>("")` menjadi `useState<string>("none")`
2. **Baris 161**: Ubah `<SelectItem value="">` menjadi `<SelectItem value="none">`
3. **Baris 77**: Update logic upload, ganti cek `if (uploadRoleTag)` menjadi `if (uploadRoleTag && uploadRoleTag !== "none")`

## File yang dimodifikasi
- `src/pages/admin/KnowledgeBase.tsx` -- 3 baris diubah

## Detail Teknis

Perubahan kecil, 3 edit di 1 file:

```text
Baris 47:  useState<string>("") --> useState<string>("none")
Baris 77:  if (uploadRoleTag)    --> if (uploadRoleTag && uploadRoleTag !== "none")
Baris 161: value=""              --> value="none"
```

Tidak ada perubahan database atau file lain.
