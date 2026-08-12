# Panel Donezo-inspired redesign — Phase 1 (Start/Dashboard) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply a Donezo-inspired visual pass (bigger card radius, tighter/softer shadow, more
card padding, Inter font) to `panel.html`'s Start/Dashboard, additive-CSS-only, on top of the
brand's existing green/gold palette.

**Architecture:** `panel.html` is a single file with all CSS in one `<style>` block (~1480
lines). There are already two prior visual layers that win the cascade over the file's original
`:root`/component rules: "Visual refresh Etap 1: SaaS/CRM polish" (line ~595, redefines
`--green`, `--bg`, shadow tokens, and re-styles `.section`/`.dashCard`/`.statCard`/header/tabs)
and a "sidebar/dashboard stage 2" pass near the end (line ~1463, adds the KPI accent bar and
hover lift). This plan adds one more layer **after** both, immediately before `</style>`, so it
wins the cascade without editing any existing rule in place — a single new block, easy to
find and easy to revert.

**Tech Stack:** Plain HTML/CSS (no build step, no framework). Verification is live-browser visual
inspection via the already-connected `mcp__claude-in-chrome__*` tools (screenshot comparison in
light + dark mode) — this codebase has no automated test suite (see
`AUDYT_PANELU_2026-08-07.md`), so there is no `pytest`/`jest` equivalent to run. Each task's
"test" step is: take a screenshot, visually confirm the expected change and that nothing else
moved.

## Global Constraints

- CSS-only. Do not change any HTML structure, `id`, or `class` name that JS reads/writes, and do
  not touch any `<script>` content.
- Keep brand colors: primary accent stays green (`--green`, currently resolves to `#2d5a27` after
  the Etap-1 cascade layer), gold (`--accent:#c9a24a`) stays as secondary accent. Do not
  reintroduce or shift to a green+white-only palette.
- All new CSS goes in one new block appended right before the closing `</style>` tag — do not
  edit the two existing visual-layer blocks in place.
- Verify live in the user's Chrome (light + dark mode, desktop width) before committing.
- Do not touch anything inside `@media(max-width:...)` blocks — mobile must not change in Phase 1.
- Font must have a working fallback (`Arial, Helvetica, sans-serif`) so nothing breaks if the
  Google Fonts request fails or is blocked.

---

### Task 1: Add Inter font via Google Fonts

**Files:**
- Modify: `panel.html:7` (inside `<head>`, right after `<title>`)

**Interfaces:**
- Produces: the page has Inter available; later tasks apply `font-family:'Inter',Arial,Helvetica,sans-serif` on `body`.

- [ ] **Step 1: Add the font `<link>` tags**

In `panel.html`, right after this existing line:
```html
<title>Panel — Sklep za Stodołą</title>
```
add:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Visual check — page still loads**

Reload the panel in the connected Chrome tab, take a screenshot. Expected: page renders exactly
as before (font-family isn't applied to `body` yet — that's Task 2), no console errors related
to the new `<link>` tags (check via `read_console_messages` if anything looks off).

---

### Task 2: Append the Phase-1 design-token CSS block

**Files:**
- Modify: `panel.html` — insert immediately before the closing `</style>` tag (currently the last
  line of the existing stage-2 dashboard block, right after `.dashKpiCard .num{font-size:28px}`
  and a blank line, before `</style>`).

**Interfaces:**
- Consumes: existing tokens `--green`, `--accent`, `--line`, `--surface` (already defined
  earlier in the cascade; not redeclared here).
- Produces: two new tokens `--radius-donezo` and `--shadow-donezo`, applied to
  `.section,.dashCard,.dashKpiCard,.statCard`.

- [ ] **Step 1: Insert the new CSS block**

Add this block right before `</style>`:
```css
  /* ============================================================
     DESIGN PASS — Faza 1, Donezo-inspired (2026-08-12): Start/
     Dashboard. CSS-only, dopisane na końcu — nic nie zmienia w
     HTML/JS/id/klasach. Buduje na warstwie "Etap 1: SaaS/CRM
     polish" (linia ~595) i "sidebar/dashboard stage 2" (wyżej):
     większy promień kart, ciaśniejszy/subtelniejszy cień, więcej
     oddechu w kartach dashboardu, nowy font. Zieleń/złoto marki
     bez zmian.
     ============================================================ */
  :root{
    --radius-donezo:16px;
    --shadow-donezo:0 4px 20px rgba(20,50,30,.08);
  }
  body.dark-theme{--shadow-donezo:0 4px 20px rgba(0,0,0,.35)}

  body{font-family:'Inter',Arial,Helvetica,sans-serif}

  .section,.dashCard,.dashKpiCard,.statCard{
    border-radius:var(--radius-donezo);
    box-shadow:var(--shadow-donezo);
  }
  .dashCard{padding:24px}
  .dashKpiCard{padding:24px;padding-top:22px}

  .mainCategoryBtn,.subCategoryBtn,.sidebar .mainCategoryBtn{border-radius:12px}
```

Note on the last rule: `.sidebar .mainCategoryBtn` (desktop sidebar, defined at
`panel.html:1447-1449`) has higher CSS specificity than a plain `.mainCategoryBtn` rule, so it
must be listed explicitly here too, or the sidebar buttons would keep their old 10px radius while
the mobile horizontal nav buttons would not.

- [ ] **Step 2: Visual check — desktop, light mode**

Take a screenshot of the Start/Dashboard page (already logged in from the earlier review this
session — reuse the same unlocked tab/session if still open, otherwise navigate to
`https://www.sklepzastodola.pl/panel.html`). Expected: KPI cards and `.section` cards have
visibly bigger rounded corners and a tighter/softer shadow than before; card text uses Inter
(visibly different from Arial — more geometric lowercase letterforms); sidebar nav item corners
are very slightly more rounded. Green/gold colors unchanged. Nothing overlaps or clips.

- [ ] **Step 3: Visual check — desktop, dark mode**

Click the "Ciemny" toggle, screenshot again. Expected: same shape/spacing changes, shadow reads
as a soft dark glow instead of the light-mode green-tinted shadow, no washed-out or invisible
text, no card blending into the background.

---

### Task 3: Commit

**Files:**
- Modify: `panel.html` (Tasks 1 and 2's combined diff)

- [ ] **Step 1: Review the diff**

Run: `git diff panel.html`
Expected: only the new `<link>` lines in `<head>` and the new CSS block before `</style>` — no
other lines touched.

- [ ] **Step 2: Commit**

```bash
git add panel.html
git commit -m "Panel: Donezo-inspired design pass on Start/Dashboard (Phase 1)

Bigger card radius, tighter/softer shadow, more dashboard-card padding,
Inter font. CSS-only additive block, brand green/gold unchanged, no
HTML/JS structure touched. See docs/superpowers/specs/2026-08-12-panel-donezo-redesign-design.md.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

- [ ] **Step 3: Update tracking notes**

Update the `panel-sidebar-dashboard-refresh` memory note (or a new one) to record: Phase 1
shipped, date, what changed, and that Phases 2+ (Klienci, Sprzedaż, Firma, Operacje, AI/System)
are still pending their own brainstorm+plan cycles.

---

## Self-review notes

- **Spec coverage:** design tokens (radius/shadow/padding/font) — Task 2. Sidebar pill radius —
  Task 2 last rule. Header/KPI-card visual emphasis — already achieved by the existing cascade
  (Etap-1 + stage-2 layers); re-verified in Task 2 Step 2/3 rather than re-implemented, since the
  spec's intent (soft shadow, rounded cards, prominent numbers) is already substantially in place
  and duplicating it would fight the existing rules instead of building on them. Page background
  neutrality — already satisfied by the existing `--bg:#fbfcfb` token from the Etap-1 layer; no
  new rule needed (confirmed by reading the resolved cascade, not just the file's first `:root`).
- **Out of scope confirmed:** no progress rings, no team-avatar treatment, no other panel
  sections — matches the spec's explicit exclusions.
- **Type/name consistency:** `--radius-donezo` and `--shadow-donezo` are the only new tokens
  introduced; used consistently in the one block that defines them, no reuse of a
  differently-spelled variable elsewhere in this plan.
