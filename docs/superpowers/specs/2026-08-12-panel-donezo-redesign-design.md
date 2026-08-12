# Panel visual redesign — Donezo-inspired design system (Phase 1: Start/Dashboard pilot)

## Goal

Redesign the private CRM panel (`panel.html`) to match the visual polish of a reference
dashboard ("Donezo" — clean white cards, generous whitespace, rounded corners, soft shadows,
thin icon+label sidebar; reference image supplied by user via Dribbble CDN URL) while:

- keeping the existing green/gold brand identity (per `CLAUDE.md`: "zielono-złoty, rolniczy,
  ale nowoczesny") instead of adopting the reference's neutral green+white palette,
- never touching HTML structure, element IDs, classes, or JS behavior that anything depends on
  — this is a live CRM with real client data, used concurrently by two people,
- rolling out in phases across the whole panel, not as one giant rewrite.

## Scope of this spec: Phase 1 only

Phase 1 = design tokens + visual pass on the **Start / Dashboard** page only, as a pilot.
Later phases (Klienci, Sprzedaż, Firma, Operacje, AI/System — each its own follow-up spec/plan)
apply the same tokens to the rest of the panel once Phase 1 is approved live.

## Constraints (non-negotiable, confirmed with user)

1. **CSS-only.** No changes to HTML structure, `id`/`class` names that JS reads or writes, or
   any JS function. Purely a new/overriding CSS layer.
2. **Brand colors stay.** Primary accent stays the existing dark green (`--green:#244b2f`);
   gold (`--accent:#c9a24a`) stays as the secondary/badge accent. No shift to the reference's
   green+white-only palette.
3. **Additive CSS.** New rules are appended after the existing `<style>` block content in
   `panel.html`, not edited in place, so the change is a self-contained, easily revertible diff.
4. **Verify live before commit.** Load the panel in the user's Chrome (light + dark mode),
   visually confirm nothing regressed, before committing.
5. Mobile behavior (`max-width:980px` and below) must not change — the existing responsive
   rules already revert the sidebar to the pre-refresh horizontal nav; Phase 1 must not
   interfere with that.

## Design tokens

| Token | Current | New (Phase 1) |
|---|---|---|
| Page background | `--light:#eef5ef` (light green tint) | `#f4f6f4` (neutral light gray) — lets white cards read as distinct surfaces |
| Card corner radius | mixed 6–14px across components | `16px` standard for `.section`, `.dashCard`, `.dashKpiCard`, `.statCard` |
| Card shadow | `--shadow-soft:0 2px 10px #0000000d` | `0 4px 24px rgba(20,50,30,.06)` — softer, more spread |
| Card padding (dashboard cards) | 14–20px | 24px |
| Font | `Arial, Helvetica, sans-serif` | `'Inter', Arial, Helvetica, sans-serif` (Google Fonts `<link>`, system stack stays as fallback so nothing breaks if the font fails to load) |
| Accent color | unchanged | unchanged — green primary, gold secondary |

Dark mode: same token *names*, adjusted values consistent with the existing dark theme override
block (`body.dark-theme`) — a neutral dark background instead of the current very dark green
tint, same radius/shadow-shape treatment scaled for dark surfaces.

## Component treatment

**Sidebar** (`.sidebar`, `.mainCategoryBtn`, desktop ≥981px layout from the Aug-2026 sidebar
refresh) — structure untouched. Active nav item gets a full green "pill" background with
`12px` radius (currently a flatter highlight). Inactive icons get a slightly muted color.

**Header** — more breathing room around the avatar/user-name area on the right; the current
strong full-width green gradient becomes a calmer, less saturated version of the same green
(still clearly branded, less heavy).

**Dashboard KPI cards** (`.dashKpiCard`, `.statCard`) — same data, same DOM, same accent-bar
concept, just: bigger radius, softer shadow instead of a flat top color bar, and a larger, more
prominent number (visual emphasis matching the reference's "24 Total Projects" treatment).

## Explicitly out of scope for Phase 1

- Circular progress rings, team-avatar list treatment, floating widget cards — these are
  reference-image details that don't map to anything in the current dashboard; not adding new
  UI elements in Phase 1, only reskinning what exists.
- Any other panel section (Klienci, Sprzedaż, Firma, Operacje, AI/System) — future phases.
- Any change to `panel.html` JS, data flow, Supabase sync, or the password gate.

## Rollout / verification plan

1. Add Google Fonts `<link>` + new CSS block to `panel.html`.
2. Open panel live in Chrome (already unlocked in user's browser), check Start/Dashboard in
   light and dark mode, desktop width.
3. Spot-check that mobile breakpoint CSS (`@media(max-width:980px)` and below) still applies
   unchanged — no visual diff expected there since Phase 1 doesn't touch those media queries.
4. Get user go-ahead, then commit with a descriptive message on a branch (not directly assuming
   push — follow normal repo convention: confirm before push if not already covered by a
   standing instruction).
5. Log Phase 1 completion + Phase 2 candidates in the panel-sidebar-dashboard-refresh memory
   note and `DECYZJE_BIZNESOWE.md` if the design language itself counts as a business decision
   worth tracking (it does — it's the new visual direction for the whole panel).

## Future phases (not designed yet, listed for tracking only)

- Phase 2: Klienci (client list cards + client detail card)
- Phase 3: Sprzedaż (advisor database), Firma (documents/cenniki/budget/finance)
- Phase 4: Operacje (zadania/checklisty/terminy/instalacje), AI/System

Each gets its own brainstorming pass before implementation — the token system from Phase 1 is
reused, but each section may need section-specific layout decisions.
