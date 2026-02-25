

# PROJECT_NORTH_STAR.md — Enterprise SaaS Replication Template

## Objective

Membuat file `PROJECT_NORTH_STAR.md` yang berfungsi sebagai **Single Source of Truth** untuk menduplikasi sistem SaaS enterprise. File ini dirancang agar AI Developer (Lovable, Claude, Gemini, Kimi, GLM) bisa membaca satu dokumen dan langsung membangun tanpa banyak bertanya.

## Kenapa Ini Penting

- Menghemat **ratusan ribu token** per proyek baru (tidak perlu instruksi berulang)
- Menghilangkan back-and-forth revisi untuk keputusan arsitektur yang sudah final
- Menjadi blueprint yang bisa di-fork untuk setiap proyek baru

## Struktur Dokumen

Template akan memiliki **9 section utama** dalam format token-efficient (tabel + list, minim paragraf naratif):

### Section 1: Project Identity (Placeholder Variables)
Semua variabel yang di-replace saat proyek baru dimulai:
- `{{PROJECT_NAME}}`, `{{PROJECT_SLUG}}`, `{{DOMAIN}}`
- `{{PRIMARY_COLOR}}`, `{{ACCENT_COLOR}}`, `{{FONT_HEADING}}`, `{{FONT_BODY}}`
- `{{DESIGN_STYLE}}` (Industrial Minimalist / Glassmorphism / Neo-Brutalist / Corporate Clean)
- `{{INDUSTRY}}`, `{{TARGET_USER}}`, `{{MONETIZATION_MODEL}}`

### Section 2: Architecture Decision Records (ADR)
Tabel keputusan tech stack final yang tidak boleh diubah AI:

| Layer | Decision | Rationale |
|-------|----------|-----------|
| Frontend | React 18 + Vite + TypeScript strict | Ecosystem maturity, Lovable native |
| Styling | Tailwind CSS + shadcn/ui + CSS Variables | Token-based design system |
| State | TanStack React Query | Server-state caching |
| Routing | React Router v6 | SPA standard |
| Backend | Lovable Cloud (Supabase) | Zero-config DB + Auth + Edge Functions |
| AI Models | Lovable AI (Gemini/GPT via proxy) | No API key required |
| Auth | Supabase Auth + RBAC via user_roles | Email verification wajib |
| Storage | Supabase Storage + CDN | File uploads |
| Deployment | Lovable Cloud (frontend) + Contabo VPS (services) | Cost-optimized |

### Section 3: Implementation Rules (Imperative Commands)
Perintah tegas untuk AI saat coding -- format checklist:
- "SELALU gunakan TypeScript strict mode"
- "JANGAN hardcode API key -- gunakan platform_settings atau edge function secrets"
- "SELALU buat RLS policy untuk setiap tabel baru"
- "GUNAKAN `as any` type assertion untuk tabel custom (Lovable Cloud pattern)"
- "JANGAN edit file auto-generated: client.ts, types.ts, config.toml, .env"
- "SELALU gunakan React.lazy() untuk route-level code splitting"
- "GUNAKAN useQuery dengan staleTime minimal 30_000ms"
- Dan 15+ rules lainnya dari pattern kedua proyek MANTRA

### Section 4: Design System Specification
- Color token mapping (CSS variables `--primary`, `--accent`, dll.)
- Typography scale (heading sizes, body, mono)
- Component patterns (Card, Badge, Button variants yang konsisten)
- Dark mode support via `darkMode: ["class"]`
- Responsive breakpoints (mobile-first, sm/md/lg/xl/2xl)
- WCAG 2.1 AA accessibility requirements

### Section 5: Database Schema Blueprint
Template tabel yang selalu ada di setiap proyek enterprise:
- `user_roles` (RBAC)
- `platform_settings` (key-value config store)
- `audit_logs` (audit trail -- BARU, dari requirement GDPR/ISO)
- `profiles` (extended user data)
- Pattern: FK ke auth.users via user_id UUID, bukan direct reference

### Section 6: Authentication & Security Checklist
- Email + password auth dengan email verification (WAJIB)
- RBAC via `user_roles` table + `is_admin()` RPC
- RLS policies on ALL tables
- Honeypot anti-bot pada forms
- Input validation via Zod
- CORS headers pada edge functions
- Audit trail logging pattern
- Encryption standards

### Section 7: SEO & Performance Requirements
- Meta tags + Open Graph + JSON-LD structured data
- robots.txt + sitemap.xml
- Target: TTI < 2s, LCP < 2.5s, CLS < 0.1
- Lazy loading images + route-level code splitting
- Gzip compression config (Nginx)

### Section 8: Folder Structure Convention
Template folder structure yang konsisten:
```
src/
  components/
    admin/      -- Dashboard components
    landing/    -- Public-facing components
    ui/         -- shadcn/ui (auto-managed)
  hooks/        -- Custom hooks (useAuth, useAdminData)
  pages/
    admin/      -- Protected admin routes
  integrations/ -- Auto-generated backend client
  lib/          -- Utilities
supabase/
  functions/    -- Edge functions
  migrations/   -- SQL migrations
```

### Section 9: Edge Function Patterns
Template untuk edge function standard:
- CORS headers pattern
- Auth token validation pattern
- Admin gate via `is_admin()` RPC
- Service role client pattern
- Error handling + logging

---

## File yang Dibuat

| File | Aksi |
|------|------|
| `PROJECT_NORTH_STAR.md` | File Markdown baru di root project, siap commit ke GitHub |

## Technical Notes

- File akan berukuran sekitar 400-500 baris Markdown
- Menggunakan format tabel dan checklist (bukan paragraf) untuk efisiensi token
- Semua placeholder menggunakan format `{{VARIABLE_NAME}}` agar mudah di-search-replace
- Diextract dari pattern nyata kedua proyek MANTRA AI dan MANTRA SKILL
- Termasuk ADR sehingga AI tidak perlu menebak tech stack

