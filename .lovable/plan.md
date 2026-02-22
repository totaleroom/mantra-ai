

# Logo & Brand Color Implementation

## Changes

### 1. Favicon & Browser Theme Color
- Copy `Asset_5.png` (rounded square logo) to `public/favicon.png` for the browser tab icon
- Copy `logo_mantra.png` (circle logo) to `public/logo_mantra.png` for Open Graph
- Update `index.html`:
  - Replace existing favicon reference with the new logo
  - Add `<meta name="theme-color" content="#F97316">` to make the address bar orange on mobile browsers (Android Chrome, iOS Safari)
  - Update page title to "Mantra AI"

### 2. Navbar Logo Update
- Copy `Asset_7.png` (horizontal logo with "MANTRA" text) to `src/assets/logo_mantra_horizontal.png`
- Update `Navbar.tsx`: Replace the current CSS-based "M" square + text with an `<img>` tag using the horizontal logo asset (sized ~32-36px height)

### 3. Footer Logo Update
- Update `Footer.tsx`: Replace the CSS "M" square logo with the same horizontal logo image

### 4. Login Page Logo
- Update `Login.tsx`: Use the circle logo (`logo_mantra.png`) copied to `src/assets/` above the login form

## Files Modified
- `index.html` — favicon, theme-color meta, title
- `src/components/landing/Navbar.tsx` — logo image
- `src/components/landing/Footer.tsx` — logo image
- `src/pages/Login.tsx` — logo image
- New assets copied into `public/` and `src/assets/`

