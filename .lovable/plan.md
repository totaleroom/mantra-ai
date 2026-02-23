

# Dashboard MANTRA: Enterprise-Grade Rombak Total

## Ringkasan

Rombak dashboard menjadi gaya **Industrial Minimalist** (NEURAL OS) dengan 3 enhancement tambahan:
1. **VPS/System Resource Widget** -- menampilkan usage metrics dari data yang sudah ada
2. **Raw System Logs Widget** -- live activity feed mirip referensi
3. **Enterprise-grade information density** -- lebih banyak data actionable dalam satu layar

---

## Layout Grid (Asymmetric)

```text
Row 1: [Active Clients] [Messages Today] [Quota Usage %]
         1fr              1.5fr            1fr

Row 2: [Needs Attention - 2 col]  [System Health - 1 col]

Row 3: [Resource Allocation - 1 col] [Raw System Logs - 2 col, dark bg]
```

Responsive: pada mobile semua menjadi 1 kolom.

---

## Widget Detail

### Row 1: Metric Cards (3 buah, gaya dot-matrix besar)

| Card | Data Source | Display |
|------|-----------|---------|
| **Active Clients** | `useClients()` filtered active | Angka `font-mono text-7xl`, subtitle "+X since last week" (bisa dihitung dari `created_at`) |
| **Messages Today** | `useMessageStats()` | Angka besar, subtitle quota harian |
| **Quota Usage** | `useClients()` sum `quota_remaining / quota_limit` | Persentase besar + progress bar industrial-style |

Styling: `border border-foreground/20 bg-card`, hover lift `-translate-y-0.5`, label `text-[10px] uppercase tracking-widest`

### Row 2: Needs Attention (2 col) + System Health (1 col)

**Needs Attention** (sama seperti referensi "Agent Status Visualizer"):
- Jika kosong: tampilan centered dengan ikon besar + teks "ALL SYSTEMS NOMINAL"  
- Jika ada items: list dengan indikator merah, clickable ke halaman terkait

**System Health / Resource Allocation** (mirip "Resource Allocation" di referensi):
- **WA Sessions**: bar horizontal `connected/total` sebagai persentase, label `WA-SESSIONS`, value `"2/3"` di kanan
- **Evolution API**: bar 0% atau 100%, label `EVO-API-GATEWAY`
- **Quota Pool**: total `quota_remaining / quota_limit` semua client, bar horizontal
- **Knowledge Base**: jumlah dokumen ready vs total
- Styling: bar tebal `h-8 border border-foreground/20` dengan fill `bg-foreground`
- Footer: rekomendasi teks italic jika ada resource yang kritis

### Row 3: Resource Bars (1 col) + System Logs (2 col, dark)

**Resource Bars** (VPS/Load simulasi dari data nyata):
- Karena MANTRA berjalan di Lovable Cloud (bukan VPS sendiri), kita **tidak bisa** mengakses CPU/RAM VPS secara langsung
- Sebagai gantinya, kita tampilkan **operational metrics** yang bermakna:
  - **MSG-THROUGHPUT**: pesan hari ini vs daily limit tertinggi dari semua client (sebagai % utilization)
  - **TOKEN-BURN-RATE**: token usage hari ini dari `message_logs`
  - **SESSION-UPTIME**: rasio connected sessions
- Ini memberikan informasi "load" yang relevan tanpa perlu akses VPS

**Raw System Logs** (dark card, mirip referensi):
- Background `bg-foreground text-background` (hitam di light mode)
- Data source: **gabungan real-time dari beberapa query**:
  - 5 pesan terbaru dari `wa_messages` (format: `> [MSG] Customer "Budi" -> Client "Salon ABC"`)
  - Billing alerts terbaru dari `billing_alerts` (format: `> [WARN] Quota rendah: Client XYZ`)
  - Eskalasi aktif (format: `> [CRITICAL] Eskalasi menunggu: Customer "Rina"` -- warna merah)
  - Session changes (format: `> [INFO] WA Session connected: Client ABC`)
- Scrollable `max-h-48 overflow-y-auto` dengan custom scrollbar
- Item critical berwarna `text-destructive` (merah)
- Footer: `MANTRA AI / Runtime v2.4.0` + timestamp

---

## Hook Baru: `useDashboardLogs`

Tambah hook baru di `useAdminData.ts` untuk fetch "system logs":

```text
export function useDashboardLogs() {
  return useQuery({
    queryKey: ["dashboardLogs"],
    queryFn: async () => {
      // Parallel fetch:
      // 1. Latest 5 wa_messages with customer name + client name
      // 2. Latest 3 unread billing_alerts
      // 3. Active human escalations
      // Merge + sort by created_at desc
      // Return as { level: "info"|"warn"|"critical", message: string, timestamp: Date }[]
    },
    staleTime: 15_000,
    refetchInterval: 15_000,  // auto-refresh setiap 15 detik
  });
}
```

## Hook Baru: `useTokenUsageToday`

```text
export function useTokenUsageToday() {
  return useQuery({
    queryKey: ["tokenUsageToday"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("message_logs")
        .select("token_usage")
        .eq("log_date", today);
      return (data || []).reduce((sum, r) => sum + (r.token_usage || 0), 0);
    },
    staleTime: 30_000,
  });
}
```

---

## CSS Baru di `src/index.css`

```text
.dot-matrix-text {
  font-family: "JetBrains Mono", monospace;
  letter-spacing: -0.05em;
}

.shadow-soft {
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.05);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1.5fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: currentColor;
  opacity: 0.3;
}
```

---

## File yang Diubah

| File | Aksi |
|------|------|
| `src/pages/admin/Dashboard.tsx` | Rewrite total -- layout NEURAL OS + semua widget baru |
| `src/hooks/useAdminData.ts` | Tambah `useDashboardLogs()` + `useTokenUsageToday()` |
| `src/index.css` | Tambah utility classes (dot-matrix-text, shadow-soft, dashboard-grid, custom-scrollbar) |

---

## Apa yang BISA vs TIDAK BISA Ditampilkan

| Metric | Bisa? | Sumber |
|--------|-------|--------|
| Active clients | Ya | `clients` table |
| Messages today | Ya | `message_logs` table |
| Token usage today | Ya | `message_logs.token_usage` |
| Quota usage % | Ya | `clients.quota_remaining / quota_limit` |
| WA session status | Ya | `wa_sessions` table |
| Evolution API status | Ya | `platform_settings` |
| Knowledge base docs | Ya | `documents` table |
| Real-time activity log | Ya | `wa_messages` + `billing_alerts` + `wa_conversations` |
| VPS CPU/RAM | Tidak | Lovable Cloud tidak expose metrics ini |
| Network bandwidth | Tidak | Tidak ada data source |

Sebagai pengganti VPS metrics, kita tampilkan **operational throughput** (message rate, token burn, session uptime) yang lebih relevan untuk SaaS monitoring.

---

## Urutan Implementasi

1. Tambah CSS utilities di `index.css`
2. Tambah hooks baru di `useAdminData.ts`
3. Rewrite `Dashboard.tsx` dengan layout + widget baru

