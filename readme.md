# Laboratórios de Segurança — Design System

**Laboratórios de Segurança** is a Brazilian educational cybersecurity training platform for QA professionals and developers. The application provides three self-contained, intentionally vulnerable web labs — SQL Injection (SQLi), Cross-Site Scripting (XSS), and Insecure Direct Object Reference (IDOR) — running on a shared Node.js/Express server backed by PostgreSQL (Supabase).

The target audience is QA students and junior developers learning offensive security through hands-on exercises in a controlled, safe environment.

---

## Sources

- **GitHub:** [farastyle/sqllabtest](https://github.com/farastyle/sqllabtest) — full server-side source (Node.js + Express + `pg`). Browse for route structure, seed data, vulnerability patterns, and inline HTML/CSS used to derive the visual language.
- **Codebase:** `repovuneravel/` — locally mounted copy of the same repository.

> No Figma file or logo asset was found. The product uses text headings only — see the **Iconography** section.

---

## Products / Surfaces

| Surface | Routes | Purpose |
|---------|--------|---------|
| **Hub** | `/` | Lab selection landing — 3-card grid |
| **SQLi Lab** | `/sqli`, `/dashboard`, `/produtos` | Login form + sidebar dashboard with 10 injectable tests + product search table |
| **XSS Lab** | `/xss`, `/xss/:sala` | Room selector + sidebar + reflected search + stored comment mural |
| **IDOR Lab** | `/idor`, `/idor/:sala` | Room selector + sidebar + 10 access-control tests |

All dashboard surfaces share the same **sidebar-accordion + main-content** layout.

---

## CONTENT FUNDAMENTALS

### Language
All copy is in **Brazilian Portuguese**. Technical terms (SQL Injection, UNION SELECT, XSS, IDOR, payload) stay in English.

### Tone & Voice
- **Instructional and encouraging** — guides students step by step with numbered lists and clear CTAs
- **Informal**: uses "você" (second-person informal), supportive phrasing ("Bem-vindo ao Laboratório!")
- **Safety-first**: every page carries a visible disclaimer — "⚠️ Este laboratório é fornecido apenas para fins educacionais. Não use estas técnicas em ambientes de produção sem autorização!"
- **Playful through emoji** — emoji serve as pseudo-icons throughout; they anchor meaning without requiring a real icon font

### Casing
- Sentence case for body/instruction copy
- Title case for lab names ("Laboratório de SQL Injection", "Loja de Produtos")
- Technical terms verbatim (SQLi, XSS, IDOR, SQL, PostgreSQL, Supabase)

### Emoji as Icons
Emoji are used **extensively and intentionally** as the only visual iconography:

| Emoji | Meaning |
|-------|---------|
| 🔬 | Main lab brand / home |
| 💉 | SQL Injection |
| 🧪 | XSS |
| 🔓 | IDOR / access control |
| ✅ | Visible / success |
| 🔒 | Hidden / restricted |
| ⚠️ | Warning |
| 💡 | Tip / hint |
| 🔍 | Search |
| 🚀 | Submit / enter action |
| 🔄 | Reset data |
| 📚 | Instructions |
| 💥 | Error / exploit result |
| 🚪 | Logout |

### Numbers & Data
- Prices: `R$ 197.00` (Brazilian Real, period decimal)
- IDs: short integers (1–10 in menus, 1001–6002 in seeded data)
- Always pair technical payload text with a plain-language explanation for non-programmers

---

## VISUAL FOUNDATIONS

### Color System
Three lab identity colors anchor the visual system. SQLi purple is the primary brand color.

| Color | Token | Value | Usage |
|-------|-------|-------|-------|
| Brand gradient | `--color-sqli-gradient` | `#667eea → #764ba2` | Headers, primary buttons |
| Brand base | `--color-brand` | `#667eea` | Card borders, accent text |
| XSS green | `--color-xss` | `#28a745` | XSS lab, success states |
| IDOR orange | `--color-idor` | `#fd7e14` | IDOR lab, warning/reset buttons |

Semantic: success `#28a745`, warning `#ffc107`, danger `#dc3545`, info `#007bff`.  
Neutrals: white `#fff` (main), `#f5f5f5` (sidebar), `#f9f9f9` (hover/muted), `#ddd` (borders).

### Typography
The source uses generic `sans-serif`. This design system upgrades to:
- **IBM Plex Sans** (UI body) — technical, clean, educational feel
- **IBM Plex Mono** (code/payloads) — hacker aesthetic, distinct from UI

> ⚠️ **Substitution:** IBM Plex Sans/Mono are not in the original product (which uses system sans-serif). Provide `.woff2` files for a more faithful match if needed.

Body is 14px; sidebar labels are 11–12px; headings are 20–32px. No display or hero typography — everything is functional and dense.

### Spacing
Base unit is **8px**. Content padding: 20–30px consistently. Sidebar: 20px padding, `280px` fixed width. Max-width containers: 800–900px (centered pages), `100vw` (sidebar layout).

### Layout
Two patterns used across all surfaces:
1. **Centered card layout** — `max-width: 800px`, `margin: 60px auto`, `padding: 20px`. Hub, login, room selectors.
2. **Sidebar + main** — `280px` fixed sidebar (gray `#f5f5f5`, scrollable, `border-right: 2px solid #ddd`), `flex: 1` main area (white, `padding: 30px`). All lab dashboards.

### Cards
- Border: `2px solid [lab-color]`
- Radius: `8px`
- Shadow: `0 4px 6px rgba(0,0,0,0.1)` resting, `0 6px 12px rgba(0,0,0,0.15)` hover
- Background: white on all cards
- Hover: `translateY(-2px)` + deeper shadow

### Info Panels (Key UI Pattern)
`border-left: 4px solid [color]` + matching light surface. Used for: instructions (blue), payload hints (yellow), danger notices (red), success/lab intro (lab color). This is the most distinctive UI pattern in the product.

### Buttons
Solid colored fill, `border-radius: 4px`, bold weight. Gradient on primary/login. Full-width in sidebar. No outline buttons in the original (ghost variant is a design-system extension).

### Tables
`border-collapse: collapse`, `1px solid #ddd` on all cells, `#f2f2f2` header with `2px solid #ddd` bottom. Highlighted rows `#fff3cd` for secret/hidden products.

### Accordion Sidebar Menu
Clickable `<a>` blocks with `12px` padding and `4px` radius. Active: solid lab-color background + white text + `2px solid` dark border. Expanded panel shows below with `4px` left border + tinted surface.

### Animation & Motion
Minimal. Only `transition: transform 0.2s` on card hover + accordion toggle. No entrance animations, infinite loops, or loading states.

### Hover & Press States
Cards: `translateY(-2px)` + shadow increase. Buttons: opacity reduction implied. No explicit non-active sidebar hover state.

### Imagery & Backgrounds
None. No photographs, illustrations, or background images. The gradient headers are the only decorative element.

### Transparency & Blur
Not used. No frosted glass.

### Corner Radii
- `4px` (`--radius-sm`) — inputs, buttons, code blocks, info panels, table container
- `8px` (`--radius-md`) — cards, gradient headers, section containers
- `9999px` (`--radius-full`) — badges, pills

---

## ICONOGRAPHY

The source product uses **emoji exclusively** as icons — no SVG icon set, no icon font, no PNG icons.

If a richer icon set is needed, **Lucide** (CDN: `https://unpkg.com/lucide@latest`) is the recommended substitute. It matches the clean stroke aesthetic appropriate for a developer/security tool. Load via: `<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>`.

> No logo asset was found. The product uses `🔬 Laboratórios de Segurança` as its text-only logotype. If an SVG or image logo exists, place it in `assets/` and update this section.

---

## Index

| Path | Contents |
|------|----------|
| `styles.css` | Root stylesheet — `@import` list only |
| `tokens/colors.css` | Color custom properties (brand, lab accents, semantic, slate, neutrals) |
| `tokens/typography.css` | IBM Plex Sans/Mono import + type-scale tokens |
| `tokens/spacing.css` | Spacing scale (4–60px), layout widths, radii |
| `tokens/shadows.css` | Box-shadow elevation tokens |
| `components/core/` | Button, Badge, Alert, CodeBlock, LabCard |
| `guidelines/` | 13 foundation specimen cards (colors, type, spacing, brand, shadows) |
| `ui_kits/lab_hub/index.html` | Hub — trilha de aprendizado (8 labs, 4 semanas, progress bar) |
| `ui_kits/lab_sqli/login.html` | SQLi login — split panel with payload quickfill |
| `ui_kits/lab_sqli/index.html` | SQLi dashboard — accordion sidebar + injectable product table |
| `ui_kits/lab_xss/index.html` | XSS lab — reflected search + stored comment mural, tab switcher |
| `ui_kits/lab_idor/index.html` | IDOR lab — 10 broken access-control tests with resource viewer |
| `templates/lab-hub/` | Lab hub template (registered in Design System tab) |
| `readme.md` | This document |
| `SKILL.md` | Agent skill definition |

### Components
- **Button** — 7 variants, 3 sizes, fullWidth, disabled
- **Badge** — 8 variants (lab identity + semantic), pill shape
- **Alert** — Left-border info panel, 7 variants, optional title
- **CodeBlock** — Monospace payload/query display, 5 border variants
- **LabCard** — Lab selection card with emoji + hover lift
