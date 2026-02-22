

# Visual Enhancement: MANTRA Control Center

Upgrade menyeluruh untuk UI admin dashboard agar sesuai standar "OCD-compliant" -- grid-based, problem-first, zero-noise.

---

## 1. "Control Tower" Dashboard (Halaman Home Baru)

**File baru**: `src/pages/admin/Dashboard.tsx`

Menggantikan redirect langsung ke `/admin/clients`. Sekarang `/admin` menampilkan dashboard overview.

**Layout**: Grid 3 kolom (desktop), 1 kolom (mobile), gap-6 konsisten.

**Widget 1 -- "Needs Attention" (kolom kiri atas, full-width)**
- List compact dari: client dengan `status = 'inactive'` atau `quota_remaining <= 0`, dan conversations `handled_by = 'HUMAN'`
- Styling: `border-destructive/30 bg-destructive/5` card, teks merah bold untuk jumlah
- Setiap item punya link langsung ke Inbox atau Client edit
- Jika kosong: tampilkan checkmark hijau "Semua Terkendali"

**Widget 2 -- "System Health" (kolom kanan atas)**
- Cek Evolution API connection (panggil manage-settings test)
- Cek jumlah wa_sessions connected vs total
- Tampilkan: icon checkmark hijau atau X merah per item
- Compact card, tanpa shadow, border halus

**Widget 3 -- "Global Statistics" (full-width, bawah)**
- 4 stat cards dalam grid: Total Active Clients, Messages Today, Active Conversations, Pending Escalations
- Typography besar (text-3xl font-bold) untuk angka, label kecil di bawah
- Border tipis, bg-card, tanpa shadow

**Routing change**: `src/App.tsx` -- ganti `<Navigate to="clients" replace />` menjadi `<Route index element={<Dashboard />} />`

**Sidebar change**: Tambah "Dashboard" sebagai menu pertama di AdminSidebar (icon: LayoutDashboard)

---

## 2. "God Mode" Client List (Upgrade `Clients.tsx`)

**File**: `src/pages/admin/Clients.tsx` (overhaul)

**Perubahan visual:**
- Layout tabel high-density: padding lebih kecil (`py-2 px-3`), font `text-sm`
- Kolom baru: "Niche" (badge tag dari `industry`), "Active Chats" (count dari wa_conversations active), "Last Activity" (relative time dari `last_activity_at`)
- Industry filter dropdown di samping search bar
- Status filter dropdown (All / Connected / Disconnected / Kuota Habis)

**Inline Quick Actions per row:**
- Dropdown menu (3 dot icon) dengan:
  - Toggle Active/Inactive (switch langsung, update `clients.status`)
  - View QR Code (buka modal DeviceManager mini -- fetch QR dari wa_sessions)
  - Edit AI Prompt (buka modal textarea untuk custom prompt per client, simpan di field baru atau platform_settings)
  - Edit Client (buka dialog form yang sudah ada)
  - Delete (confirm dialog yang sudah ada)

**Sort**: Default sort by `last_activity_at` desc (client paling aktif di atas)

**Visual rules:**
- Gunakan `border border-border` tanpa shadow
- Badge warna untuk industry: F&B (orange), Salon (pink), Real Estate (blue), lainnya (gray)
- Row hover: `hover:bg-muted/30`
- Baris client inactive: `opacity-60`

---

## 3. "Master" Knowledge Base (Upgrade `KnowledgeBase.tsx`)

**File**: `src/pages/admin/KnowledgeBase.tsx` (overhaul)

**Perubahan utama:**
- **Unified view**: Tampilkan dokumen dari SEMUA client secara default, dengan filter dropdown per client
- **Card-based layout**: Ganti table menjadi grid card (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`)
- Setiap card menampilkan:
  - Client name (badge di atas)
  - Document title (font-medium)
  - Role tag badge (warna: admin=blue, warehouse=amber, owner=purple, none=gray)
  - Status badge
  - Tanggal upload (text-xs)
  - Delete button (icon, pojok kanan atas)
- **Role tag inline edit**: Klik badge role_tag untuk toggle dropdown dan ubah langsung (update via supabase)
- **Upload zone** tetap di atas: minimalis, drag-and-drop, dropdown "Target Client" + dropdown "Role Tag"
- **Test chatbox** tetap di bawah

---

## 4. "Super Inbox" (Upgrade `Inbox.tsx` + components)

**File**: `src/pages/admin/Inbox.tsx`, `src/components/admin/InboxSidebar.tsx`, `src/components/admin/InboxChat.tsx`

**InboxSidebar perubahan:**
- Group by Client Name first (collapsible sections per client)
- HUMAN conversations: `bg-destructive/5 border-l-4 border-l-destructive` -- warna lebih tegas
- AI conversations: clean, tanpa highlight
- Icon yang lebih jelas: User icon merah untuk HUMAN, Bot icon biru untuk AI
- Last message preview truncated 1 line
- Timestamp relative ("5m ago") di pojok kanan atas setiap item

**InboxChat perubahan:**
- Chat bubbles lebih bersih:
  - USER: align left, `bg-muted rounded-lg rounded-tl-none`
  - AI: align right, `bg-primary/10 rounded-lg rounded-tr-none`
  - ADMIN: align right, `bg-green-500/10 rounded-lg rounded-tr-none`
- Sender label sebagai small badge di atas bubble (bukan di dalam)
- Timestamp di bawah bubble, aligned sesuai sender
- Input area: lebih bersih, rounded-full input untuk single line feel

---

## 5. "Visual Settings" (Upgrade `Settings.tsx`)

**File**: `src/pages/admin/Settings.tsx`

**Perubahan utama:**
- **Prompt Presets**: Tambah fitur baru di tab "AI Configuration"
  - Dropdown "Preset" di atas textarea system prompt
  - 3 preset bawaan (disimpan di platform_settings):
    - "Professional Seller" -- formal, fokus closing
    - "Friendly Helper" -- santai, ramah
    - "Custom" -- prompt manual
  - Saat pilih preset, isi textarea otomatis. Saat edit manual, otomatis switch ke "Custom"
  - Tombol "Save as Preset" untuk simpan prompt saat ini

- **Visual toggles**: Gunakan Switch component untuk setting boolean (jika ada nanti)
- **Grid layout**: Form fields dalam grid 2 kolom yang konsisten
- **Section dividers**: Gunakan `Separator` antar section dalam setiap tab

---

## 6. Global Visual Polish

**File**: `src/index.css` + `src/components/admin/AdminLayout.tsx`

- **AdminLayout header**: Tambah breadcrumb atau page title di header bar
- **Consistent spacing**: Semua page content pakai `p-6 space-y-6`
- **Card style global**: `border border-border bg-card rounded-lg` tanpa shadow (hapus `shadow-sm` dari Card component atau override)
- **Typography hierarchy**: h1 = `text-2xl font-bold`, section title = `text-sm font-semibold uppercase tracking-wide text-muted-foreground`

---

## Detail Teknis

### File baru:
- `src/pages/admin/Dashboard.tsx` -- Control Tower dashboard

### File yang dimodifikasi:
- `src/App.tsx` -- Tambah route Dashboard, ubah index redirect
- `src/components/admin/AdminSidebar.tsx` -- Tambah menu Dashboard + realtime badge
- `src/components/admin/AdminLayout.tsx` -- Header polish
- `src/pages/admin/Clients.tsx` -- God Mode table + inline actions + filters
- `src/pages/admin/KnowledgeBase.tsx` -- Card-based unified view + inline edit
- `src/pages/admin/Inbox.tsx` -- Layout adjustments
- `src/components/admin/InboxSidebar.tsx` -- Client grouping + visual upgrade
- `src/components/admin/InboxChat.tsx` -- Chat bubble redesign
- `src/pages/admin/Settings.tsx` -- Prompt presets + visual polish

### Tidak perlu migration:
- Semua data sudah tersedia di tabel yang ada
- Prompt presets disimpan di `platform_settings` (key: `prompt_presets`, value: JSON array)

### Urutan implementasi:
1. Dashboard.tsx baru + routing + sidebar update
2. Clients.tsx overhaul (table + filters + inline actions)
3. KnowledgeBase.tsx overhaul (card view + inline edit)
4. InboxSidebar + InboxChat visual upgrade
5. Settings.tsx prompt presets
6. Global polish (AdminLayout header, spacing consistency)

