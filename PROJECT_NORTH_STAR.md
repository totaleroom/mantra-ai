# PROJECT_NORTH_STAR.md — Enterprise SaaS Replication Template

> **Single Source of Truth** untuk AI Developer. Baca file ini → bangun tanpa bertanya.
> Extracted dari production patterns: MANTRA AI & MANTRA SKILL.

---

## 1. PROJECT IDENTITY (Replace All Placeholders)

| Variable | Value | Example |
|----------|-------|---------|
| `{{PROJECT_NAME}}` | Nama produk | MANTRA AI |
| `{{PROJECT_SLUG}}` | URL slug | mantra-ai |
| `{{DOMAIN}}` | Domain produksi | mantraumkm.lovable.app |
| `{{TAGLINE}}` | Tagline 1 kalimat | "AI Customer Service untuk UMKM Indonesia" |
| `{{PRIMARY_COLOR}}` | HSL primary | `24 95% 45%` |
| `{{PRIMARY_FOREGROUND}}` | HSL primary-fg | `0 0% 100%` |
| `{{ACCENT_COLOR}}` | HSL accent | `142 71% 45%` |
| `{{ACCENT_FOREGROUND}}` | HSL accent-fg | `0 0% 100%` |
| `{{BACKGROUND}}` | HSL background | `30 100% 97%` |
| `{{FOREGROUND}}` | HSL foreground | `220 20% 10%` |
| `{{FONT_HEADING}}` | Display font | `"Archivo Black", sans-serif` |
| `{{FONT_BODY}}` | Body font | `"Space Grotesk", sans-serif` |
| `{{FONT_MONO}}` | Monospace font | `"JetBrains Mono", monospace` |
| `{{BORDER_RADIUS}}` | Base radius | `0.75rem` / `0px` (neo-brutalist) |
| `{{DESIGN_STYLE}}` | Design system | See Section 4 |
| `{{INDUSTRY}}` | Target industri | UMKM / HR-Tech / E-Commerce |
| `{{TARGET_USER}}` | Persona utama | Owner bisnis kecil |
| `{{MONETIZATION}}` | Model bisnis | B2B SaaS subscription |
| `{{LOCALE}}` | Bahasa default | `id` (Indonesia) |

---

## 2. ARCHITECTURE DECISION RECORDS (ADR)

> ⛔ **LOCKED** — AI tidak boleh mengubah keputusan di tabel ini.

| Layer | Decision | Rationale |
|-------|----------|-----------|
| **Frontend** | React 18 + Vite + TypeScript strict | Lovable native, ecosystem maturity |
| **Styling** | Tailwind CSS + shadcn/ui + CSS Variables | Token-based, consistent design system |
| **State** | TanStack React Query v5 | Server-state caching, auto-refetch |
| **Client State** | React Context (auth only) | Minimal client state |
| **Routing** | React Router v6 | SPA standard, nested routes |
| **Backend** | Lovable Cloud (Supabase) | Zero-config: DB + Auth + Edge Functions + Storage |
| **AI Gateway** | Lovable AI (`ai.gateway.lovable.dev`) | OpenAI-compatible API, no user API key needed |
| **Auth** | Supabase Auth + RBAC via `user_roles` | Email verification WAJIB |
| **Database** | PostgreSQL (via Supabase) | RLS, full-text search, realtime |
| **Storage** | Supabase Storage + signed URLs | File uploads, media handling |
| **Edge Runtime** | Deno (Supabase Edge Functions) | Auto-deploy, serverless |
| **Deployment** | Lovable Cloud (frontend) + Contabo VPS (services) | Cost-optimized |
| **Forms** | React Hook Form + Zod | Validation, type-safe |
| **Icons** | Lucide React | Tree-shakeable, consistent |
| **Notifications** | Sonner | Toast notifications |
| **Charts** | Recharts | Dashboard visualizations |

### AI Model Selection Guide

| Use Case | Model | Rationale |
|----------|-------|-----------|
| Simple tasks (classify, summarize) | `google/gemini-2.5-flash-lite` | Cheapest, fastest |
| Balanced tasks (chat, analysis) | `google/gemini-2.5-flash` | Cost vs quality sweet spot |
| Complex reasoning | `google/gemini-2.5-pro` | Highest accuracy |
| Fallback / alternative | `openai/gpt-5-mini` | Different model family |

---

## 3. IMPLEMENTATION RULES (Imperative Commands)

### 🔴 WAJIB (Must Do)

- [ ] **SELALU** gunakan TypeScript strict mode — no `any` kecuali pattern `as any` untuk Lovable Cloud custom tables/RPC
- [ ] **SELALU** buat RLS policy untuk setiap tabel baru — **TANPA KECUALI**
- [ ] **SELALU** gunakan `React.lazy()` untuk route-level code splitting
- [ ] **SELALU** gunakan `useQuery` dengan `staleTime` minimal `30_000` ms
- [ ] **SELALU** gunakan semantic CSS tokens (`bg-primary`, `text-foreground`) — **JANGAN** hardcode warna
- [ ] **SELALU** import Supabase client dari `@/integrations/supabase/client`
- [ ] **SELALU** gunakan HSL format untuk semua CSS color variables
- [ ] **SELALU** validasi input dengan Zod sebelum submit ke backend
- [ ] **SELALU** handle CORS di edge functions dengan pattern `_shared/cors.ts`
- [ ] **SELALU** verifikasi auth token di edge functions sebelum operasi data
- [ ] **SELALU** gunakan `SUPABASE_SERVICE_ROLE_KEY` (bukan anon) untuk operasi admin di edge functions
- [ ] **SELALU** wrap admin routes dengan `<ProtectedRoute>` component
- [ ] **SELALU** handle loading dan error states di setiap komponen yang fetch data
- [ ] **SELALU** gunakan `maybeSingle()` bukan `single()` untuk query yang mungkin return 0 rows
- [ ] **SELALU** tambahkan `updated_at` trigger untuk setiap tabel yang perlu tracking

### 🚫 DILARANG (Never Do)

- [ ] **JANGAN** hardcode API key di code — gunakan `platform_settings` table atau edge function secrets
- [ ] **JANGAN** edit file auto-generated: `client.ts`, `types.ts`, `config.toml`, `.env`
- [ ] **JANGAN** buat foreign key langsung ke `auth.users` — gunakan `user_id UUID` tanpa FK
- [ ] **JANGAN** gunakan `CHECK` constraint dengan `now()` — gunakan validation trigger
- [ ] **JANGAN** modifikasi schema reserved: `auth`, `storage`, `realtime`, `supabase_functions`, `vault`
- [ ] **JANGAN** gunakan anonymous sign-up — selalu email + password
- [ ] **JANGAN** gunakan `createClient` baru di frontend — import dari integrations
- [ ] **JANGAN** simpan state global di Redux/Zustand — gunakan React Query + Context
- [ ] **JANGAN** tulis paragraf naratif di dokumentasi — gunakan tabel + list
- [ ] **JANGAN** buat file `config.toml` baru — hanya ada SATU di `supabase/config.toml`

### 💡 PATTERN (Best Practices)

- Gunakan `as any` type assertion untuk tabel custom yang belum ada di generated types
- Gunakan `AbortController` dengan timeout 25s untuk AI API calls
- Gunakan `platform_settings` table sebagai key-value config store (runtime-configurable)
- Error response format: `{ error: "Human readable message" }` — konsisten di semua edge functions
- Rate limit handling: return `429` dengan pesan user-friendly
- Credits exhausted: return `402` dengan instruksi top-up

---

## 4. DESIGN SYSTEM SPECIFICATION

### Available Design Styles

| Style | `--radius` | Fonts | Shadow | Character |
|-------|-----------|-------|--------|-----------|
| **Neo-Brutalist** | `0px` | Archivo Black + Space Grotesk | `4px 4px 0px 0px rgba(0,0,0,1)` | Bold, sharp edges, neon accents |
| **Industrial Minimalist** | `0.75rem` | Inter + JetBrains Mono | `0 20px 40px -10px rgba(0,0,0,0.05)` | Clean, warm, professional |
| **Glassmorphism** | `1rem` | Satoshi + Inter | `backdrop-blur-xl` + subtle border | Translucent layers, depth |
| **Corporate Clean** | `0.5rem` | DM Sans + Inter | Standard elevation | Enterprise-safe, formal |

### CSS Variable Token Map (index.css)

```css
:root {
  /* Core palette — replace with {{PLACEHOLDER}} values */
  --background: {{BACKGROUND}};
  --foreground: {{FOREGROUND}};
  --card: 0 0% 100%;
  --card-foreground: {{FOREGROUND}};
  --popover: 0 0% 100%;
  --popover-foreground: {{FOREGROUND}};
  --primary: {{PRIMARY_COLOR}};
  --primary-foreground: {{PRIMARY_FOREGROUND}};
  --secondary: 220 14% 96%;
  --secondary-foreground: {{FOREGROUND}};
  --muted: 220 14% 96%;
  --muted-foreground: 220 9% 40%;
  --accent: {{ACCENT_COLOR}};
  --accent-foreground: {{ACCENT_FOREGROUND}};
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  --border: 220 13% 91%;
  --input: 220 13% 91%;
  --ring: {{PRIMARY_COLOR}};
  --radius: {{BORDER_RADIUS}};

  /* Sidebar tokens */
  --sidebar-background: 0 0% 98%;
  --sidebar-foreground: 240 5.3% 26.1%;
  --sidebar-primary: 240 5.9% 10%;
  --sidebar-primary-foreground: 0 0% 98%;
  --sidebar-accent: 240 4.8% 95.9%;
  --sidebar-accent-foreground: 240 5.9% 10%;
  --sidebar-border: 220 13% 91%;
  --sidebar-ring: {{PRIMARY_COLOR}};
}
```

### Dark Mode (WAJIB)

```css
.dark {
  --background: 220 20% 6%;
  --foreground: 0 0% 95%;
  /* Invert primary/secondary, increase accent saturation */
}
```

Config: `darkMode: ["class"]` di `tailwind.config.ts`

### Typography Scale

| Element | Class | Size |
|---------|-------|------|
| Page title (H1) | `text-4xl font-display` | 36px |
| Section title (H2) | `text-2xl font-display` | 24px |
| Card title (H3) | `text-lg font-semibold` | 18px |
| Body | `text-base font-body` | 16px |
| Small/Caption | `text-sm text-muted-foreground` | 14px |
| Code/Mono | `font-mono text-sm` | 14px |

### Tailwind Config Essentials

```ts
// tailwind.config.ts
export default {
  darkMode: ["class"],
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      fontFamily: {
        display: ['"{{FONT_HEADING}}"', 'sans-serif'],
        body: ['"{{FONT_BODY}}"', 'sans-serif'],
      },
      colors: {
        // ALL colors mapped to CSS variables via hsl(var(--token))
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        // ... same pattern for all tokens
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

### Responsive Breakpoints (Mobile-First)

| Breakpoint | Width | Target |
|------------|-------|--------|
| default | < 640px | Mobile phones |
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1400px | Wide screens (container max) |

### WCAG 2.1 AA Requirements

- Contrast ratio: ≥ 4.5:1 (normal text), ≥ 3:1 (large text)
- All interactive elements: keyboard-accessible
- Images: descriptive `alt` attributes
- Forms: associated `<label>` elements
- Focus indicators: visible outline on all focusable elements
- ARIA labels on icon-only buttons

---

## 5. DATABASE SCHEMA BLUEPRINT

### Core Tables (Present in EVERY Project)

```sql
-- RBAC: Role-Based Access Control
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,  -- NO FK to auth.users!
  role app_role NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- RLS: Only admins can read/write
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read" ON public.user_roles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Platform Settings: Runtime key-value config store
CREATE TABLE public.platform_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- RLS: Admin-only CRUD
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Audit Logs: GDPR/ISO compliance trail
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,        -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT'
  table_name TEXT,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
-- RLS: Admin read-only, insert via service_role only
CREATE POLICY "Admin read" ON public.audit_logs FOR SELECT USING (
  (SELECT public.is_admin())
);

-- Profiles: Extended user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,  -- NO FK to auth.users!
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
```

### Security Definer Functions

```sql
-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Check specific role
CREATE OR REPLACE FUNCTION public.has_role(_role app_role, _user_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply to tables:
-- CREATE TRIGGER update_[table]_updated_at
--   BEFORE UPDATE ON public.[table]
--   FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

### Schema Design Rules

| Rule | Rationale |
|------|-----------|
| `user_id UUID NOT NULL` tanpa FK | Avoid dependency on `auth.users` schema |
| `gen_random_uuid()` default | Auto-generate UUIDs |
| `TIMESTAMPTZ` bukan `TIMESTAMP` | Timezone-aware |
| `DEFAULT now()` pada `created_at` | Auto-populate |
| `JSONB` untuk flexible data | Audit logs, metadata |
| `TEXT` bukan `VARCHAR(n)` | No arbitrary length limits |
| Enum via `CREATE TYPE` | Type-safe roles, statuses |

---

## 6. AUTHENTICATION & SECURITY CHECKLIST

### Auth Flow

- [x] Email + password signup dengan email verification (WAJIB, no auto-confirm)
- [x] Login → `supabase.auth.signInWithPassword()`
- [x] Signup → `supabase.auth.signUp()` → email verification → login
- [x] Logout → `supabase.auth.signOut()` → clear state
- [x] Auth state listener: `supabase.auth.onAuthStateChange()` → THEN `getSession()`
- [ ] OAuth 2.0 (Google, GitHub) — via `supabase.auth.signInWithOAuth()`
- [ ] MFA — via `supabase.auth.mfa.enroll()` + `verify()`

### RBAC Pattern (Proven)

```tsx
// hooks/useAuth.ts — Proven pattern from both MANTRA projects
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const { data } = await supabase.rpc("is_admin" as any);
          setIsAdmin(!!data);
        } else { setIsAdmin(false); }
        setLoading(false);
      }
    );
    // 2. THEN check existing session
    supabase.auth.getSession().then(/* same logic */);
    return () => subscription.unsubscribe();
  }, []);

  return { user, isAdmin, loading, signIn, signUp, signOut };
}
```

### Security Checklist

| Area | Implementation | Status |
|------|---------------|--------|
| RLS on ALL tables | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` | 🔴 WAJIB |
| Admin gate (edge fn) | `is_admin()` RPC check | 🔴 WAJIB |
| Auth token validation | Verify `Authorization: Bearer` header | 🔴 WAJIB |
| Input validation | Zod schemas on all form inputs | 🔴 WAJIB |
| CORS headers | `_shared/cors.ts` with origin whitelist | 🔴 WAJIB |
| Honeypot anti-bot | Hidden field on public forms | 🟡 Recommended |
| Rate limiting | Return `429` on excessive requests | 🟡 Recommended |
| Audit trail | Log CRUD operations to `audit_logs` | 🟡 Recommended |
| Encryption at rest | Supabase default (AES-256) | ✅ Built-in |
| HTTPS | Lovable Cloud default | ✅ Built-in |
| SQL injection | Parameterized queries via Supabase SDK | ✅ Built-in |

---

## 7. SEO & PERFORMANCE REQUIREMENTS

### SEO Checklist

| Element | Implementation |
|---------|---------------|
| `<title>` | < 60 chars, main keyword first |
| `<meta name="description">` | < 160 chars, include CTA |
| Single `<H1>` | Matches page intent |
| Semantic HTML | `<header>`, `<main>`, `<section>`, `<footer>`, `<nav>` |
| Open Graph | `og:title`, `og:description`, `og:image`, `og:url` |
| JSON-LD | `Organization`, `Product`, `FAQ` as applicable |
| `robots.txt` | Allow all, link to sitemap |
| `sitemap.xml` | All public routes, auto-updated |
| Canonical URL | `<link rel="canonical">` on all pages |
| Alt attributes | Descriptive text on all `<img>` |
| Lazy loading | `loading="lazy"` on below-fold images |

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| TTI (Time to Interactive) | < 2.0s | Lighthouse |
| LCP (Largest Contentful Paint) | < 2.5s | Core Web Vitals |
| CLS (Cumulative Layout Shift) | < 0.1 | Core Web Vitals |
| FID / INP | < 200ms | Core Web Vitals |
| Bundle size (initial) | < 200KB gzipped | Vite build |

### Performance Implementation

- `React.lazy()` + `<Suspense>` untuk semua route kecuali Index
- `staleTime: 30_000` pada semua `useQuery` calls
- Image optimization: WebP/AVIF format, responsive `srcset`
- Font loading: `font-display: swap`, preload critical fonts
- Vite code splitting: automatic per-route chunks

### Nginx Config (VPS Deployment)

```nginx
server {
    listen 443 ssl http2;
    server_name {{DOMAIN}};

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;

    location / {
        root /var/www/{{PROJECT_SLUG}};
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    ssl_certificate /etc/letsencrypt/live/{{DOMAIN}}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/{{DOMAIN}}/privkey.pem;
}
```

---

## 8. FOLDER STRUCTURE CONVENTION

```
{{PROJECT_SLUG}}/
├── public/
│   ├── favicon.ico
│   ├── robots.txt
│   ├── sitemap.xml
│   └── logo_{{PROJECT_SLUG}}.png
├── src/
│   ├── assets/                    # Static assets (imported via ES6)
│   ├── components/
│   │   ├── admin/                 # Dashboard: AdminLayout, AdminSidebar, ProtectedRoute
│   │   ├── landing/               # Public: Hero, Features, Pricing, FAQ, Footer, Navbar
│   │   └── ui/                    # shadcn/ui (auto-managed — JANGAN edit manual)
│   ├── contexts/                  # React Context (AuthContext only)
│   ├── hooks/                     # Custom hooks: useAuth, useAdminData, useMobile
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts          # ⛔ AUTO-GENERATED — jangan edit
│   │       └── types.ts           # ⛔ AUTO-GENERATED — jangan edit
│   ├── lib/
│   │   └── utils.ts               # cn() helper, utilities
│   ├── pages/
│   │   ├── Index.tsx              # Landing page (eager load)
│   │   ├── Login.tsx              # Auth page
│   │   ├── NotFound.tsx           # 404 page
│   │   └── admin/                 # Dashboard, Clients, Settings, etc. (lazy load)
│   ├── App.tsx                    # Router + providers
│   ├── App.css                    # Minimal global styles
│   ├── index.css                  # Design tokens (CSS variables)
│   └── main.tsx                   # Entry point
├── supabase/
│   ├── config.toml                # ⛔ AUTO-GENERATED — jangan edit
│   ├── functions/
│   │   ├── _shared/
│   │   │   └── cors.ts            # Shared CORS headers
│   │   ├── {{function-name}}/
│   │   │   └── index.ts           # Edge function entry
│   │   └── ...
│   └── migrations/                # SQL migrations (managed by tool)
├── .env                           # ⛔ AUTO-GENERATED — jangan edit
├── PROJECT_NORTH_STAR.md          # 📖 This file
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── index.html
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Component file | PascalCase | `AdminSidebar.tsx` |
| Hook file | camelCase with `use` prefix | `useAuth.ts` |
| Page file | PascalCase | `Dashboard.tsx` |
| Edge function dir | kebab-case | `wa-webhook/` |
| DB table | snake_case | `user_roles` |
| DB column | snake_case | `created_at` |
| CSS variable | kebab-case | `--primary-foreground` |
| Env variable | SCREAMING_SNAKE | `SUPABASE_SERVICE_ROLE_KEY` |

---

## 9. EDGE FUNCTION PATTERNS

### Shared CORS (`supabase/functions/_shared/cors.ts`)

```ts
const allowedOrigins = [
  "https://{{DOMAIN}}",
  "https://{{PROJECT_SLUG}}.lovable.app",
  // Add preview URLs during development
];

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}
```

### Standard Edge Function Template

```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // 1. CORS preflight
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    // 2. Auth verification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 3. User-scoped client (respects RLS)
    const sbUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await sbUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. (Optional) Admin gate
    // const { data: admin } = await sbUser.rpc("is_admin");
    // if (!admin) return new Response(..., { status: 403 });

    // 5. Service role client (bypasses RLS — for admin operations)
    // const sbAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 6. Business logic
    const body = await req.json();
    // ... your logic here ...

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Function error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
```

### AI Gateway Call Pattern

```ts
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 25000);

const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "google/gemini-2.5-flash",  // See AI Model Selection Guide
    messages: [
      { role: "system", content: "Your system prompt here" },
      { role: "user", content: userInput },
    ],
    // Optional: structured output via function calling
    tools: [{ type: "function", function: { name: "...", parameters: {...} } }],
    tool_choice: { type: "function", function: { name: "..." } },
  }),
  signal: controller.signal,
}).finally(() => clearTimeout(timeoutId));

// Handle rate limits
if (response.status === 429) return respond(429, "Rate limit exceeded");
if (response.status === 402) return respond(402, "Credits exhausted");
if (!response.ok) throw new Error("AI gateway error");

const result = await response.json();
const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
const parsed = JSON.parse(toolCall.function.arguments);
```

### Webhook Pattern (External Service → Edge Function)

```ts
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return respond(405, "Method not allowed");

  // Verify webhook secret (no auth token for external services)
  const secret = req.headers.get("X-Webhook-Secret") ||
    new URL(req.url).searchParams.get("secret");
  if (Deno.env.get("WEBHOOK_SECRET") && secret !== Deno.env.get("WEBHOOK_SECRET")) {
    return respond(403, "Invalid webhook secret");
  }

  // Use service role client (webhooks bypass RLS)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const body = await req.json();
  // ... process webhook payload ...
});
```

---

## 10. APP ARCHITECTURE PATTERN

### Router Setup (App.tsx)

```tsx
import React, { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Eager load: landing page (LCP critical)
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy load: all other routes
const Login = React.lazy(() => import("./pages/Login"));
const Dashboard = React.lazy(() => import("./pages/admin/Dashboard"));
// ... more lazy imports ...

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

const LazyFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="font-display text-xl animate-pulse">Memuat...</div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster /><Sonner />
      <BrowserRouter>
        <Suspense fallback={<LazyFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              {/* Nested admin routes */}
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
```

### Landing Page Structure

```
Index.tsx
├── Navbar          — Fixed top, responsive hamburger
├── Hero            — Above fold, primary CTA
├── Problem         — Pain points
├── Features        — Solution highlights
├── HowItWorks      — Step-by-step flow
├── Pricing         — Plans & comparison
├── Testimonials    — Social proof
├── FAQ             — Accordion
├── FinalCTA        — Closing call-to-action
└── Footer          — Links, copyright, social
```

---

## QUICK START: New Project Checklist

1. [ ] Fork this template / copy `PROJECT_NORTH_STAR.md` ke repo baru
2. [ ] Search-replace semua `{{PLACEHOLDER}}` values
3. [ ] Pilih `{{DESIGN_STYLE}}` → copy CSS tokens ke `index.css`
4. [ ] Enable Lovable Cloud → auto-creates Supabase project
5. [ ] Run database migrations (Section 5: Core Tables)
6. [ ] Implement auth flow (Section 6: useAuth hook)
7. [ ] Create `_shared/cors.ts` dengan domain whitelist
8. [ ] Setup landing page components (Section 10)
9. [ ] Setup admin dashboard with `ProtectedRoute`
10. [ ] Deploy: `robots.txt` + `sitemap.xml` + meta tags
11. [ ] Run Lighthouse audit → target semua hijau
12. [ ] Enable AI Gateway jika project butuh AI features

---

*Generated from production patterns: MANTRA AI v1.x & MANTRA SKILL v1.x*
*Last updated: 2026-02-25*
