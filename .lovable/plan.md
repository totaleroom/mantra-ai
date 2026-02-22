

# Implementation: Token Trimming + Storage RLS Policy

## 1. Token Trimming (`wa-webhook/index.ts`)

Tambah helper function `trimHistoryByCharLimit` di bagian atas file (setelah `buildChatMessages`), lalu panggil di baris 371.

### Helper Function:

```text
function trimHistoryByCharLimit(messages: any[], maxChars: number = 3000): any[] {
  if (messages.length === 0) return messages;

  const getTextLength = (content: any): number => {
    if (typeof content === "string") return content.length;
    if (Array.isArray(content)) {
      return content
        .filter((p: any) => p.type === "text")
        .reduce((sum: number, p: any) => sum + (p.text?.length || 0), 0);
    }
    return 0;
  };

  let totalChars = messages.reduce((sum, m) => sum + getTextLength(m.content), 0);

  if (totalChars <= maxChars) return messages;

  const trimmed = [...messages];
  const originalCount = trimmed.length;

  while (totalChars > maxChars && trimmed.length > 1) {
    const removed = trimmed.shift();
    totalChars -= getTextLength(removed.content);
  }

  console.warn(`Chat history trimmed from ${originalCount} to ${trimmed.length} messages (${totalChars} chars)`);
  return trimmed;
}
```

### Perubahan di baris 371:

Dari:
```text
const historyMessages = buildChatMessages(chatHistory || []);
```

Menjadi:
```text
const historyMessages = buildChatMessages(chatHistory || []);
const trimmedMessages = trimHistoryByCharLimit(historyMessages, 3000);
```

### Perubahan di baris 453:

Dari:
```text
...historyMessages,
```

Menjadi:
```text
...trimmedMessages,
```

---

## 2. Storage RLS Policy (SQL Migration)

Satu migration file baru:

```sql
CREATE POLICY "Admins can read knowledge files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'knowledge' AND (SELECT public.is_admin()));
```

---

## Ringkasan

| File | Perubahan |
|------|-----------|
| `supabase/functions/wa-webhook/index.ts` | Tambah `trimHistoryByCharLimit()` (setelah baris 68), ubah baris 371 dan 453 |
| Migration SQL baru | RLS SELECT policy pada `storage.objects` untuk bucket `knowledge` |

### Hasil Akhir:
- AI punya short-term memory (max 3000 chars, pesan terlama dipotong duluan)
- Gambar tersimpan aman di bucket `knowledge` dengan signed URL
- Admin bisa view gambar via RLS policy sebagai safety net
- `console.warn` akan muncul di log jika trimming terjadi untuk monitoring

