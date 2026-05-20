## Context

The Stitch design at screen `c439a6f5a4524d86a97d41c8115e2d9d` ("智能导诊 - 开始导航弹窗 (Glassmorphism)") provides a complete navigation modal mockup using raw HTML + Tailwind CSS. The target implementation is Vue 3 + Vuetify 3 using the existing "Clinical Sanctuary" design tokens.

**Source design (Stitch HTML):**
- Full-viewport modal overlay with dimmed/blurred background
- Glassmorphism card: `bg-surface-container-lowest/70`, `backdrop-blur-2xl`, `rounded-[2rem]`, ghost border `border-outline-variant/15`
- Internal glow: decorative circle with `bg-primary-container/20` and `blur-[40px]`
- Circular icon container: `w-16 h-16`, gradient `from-primary to-primary-dim`, icon "straight"
- Destination headline: "下一地点：洗手间", Manrope bold, text-lg, primary color
- Time badge: frosted pill `bg-surface-container-high/50`, `backdrop-blur-md`, clock icon + "预计时间：3分钟"
- CTA button: full-width, gradient `from-primary to-primary-dim`, rounded-full, shimmer effect on hover

**Target environment:**
- Vue 3 + Vuetify 3 + SCSS
- Design tokens in `src/styles/tokens.scss` (CSS custom properties)
- Vuetify theme with matching color palette
- Manrope for headlines, Inter for body

## Goals / Non-Goals

**Goals:**
- Faithful visual reproduction of the glassmorphism navigation modal
- New route `/triage-car` registered in Vue Router
- Static rendering only — all text, icons, and layout match the design
- Use existing Vuetify components and MDI icons
- All custom styling via scoped SCSS using existing design token variables

**Non-Goals:**
- No interactive behavior (button clicks, navigation, state changes)
- No API integration or data fetching
- No animation on mount (static render)
- No responsive variants beyond the mobile-first 390px design
- No dark mode variant for this page
- No connection to the existing TriageChat conversation flow

## Decisions

### Decision 1: Page vs Component

**Choice:** Implement as a full page component at `src/pages/TriageCarPage.vue` with its own route.

**Rationale:** The user explicitly requested integration at `/triage-car` as a page. This keeps it isolated from the existing TriageChat flow, allowing the modal to be viewed and refined independently before any integration with the conversation state machine.

**Alternative considered:** Embed as a sub-component within TriageChat.vue. Rejected — the user wants to see it standalone first before adding interactivity.

### Decision 2: Background Blur Implementation

**Choice:** Use CSS `backdrop-filter: blur()` on an overlay div, with decorative blurred circles using `filter: blur()`.

**Rationale:** The Stitch design uses Tailwind's `backdrop-blur-sm` (4px) on the background overlay and `backdrop-blur-2xl` (40px) on the modal card. CSS `backdrop-filter` is well-supported in modern browsers and doesn't require any JS.

### Decision 3: Icon Mapping

**Choice:** Use Vuetify's `v-icon` with MDI icon `mdi-arrow-right-bold` as a substitute for the Material Symbols "straight" icon.

**Rationale:** The Stitch design uses Material Symbols "straight" icon. MDI (`@mdi/font`) is already installed and configured in Vuetify. The `mdi-arrow-right-bold` icon provides a similar directional arrow appearance.

**Alternative considered:** Import Material Symbols font. Rejected — adds a second icon library for a single icon, violating simplicity.

### Decision 4: Glassmorphism Styling Approach

**Choice:** Custom scoped SCSS with explicit backdrop-filter, semi-transparent backgrounds, and ghost borders.

**Rationale:** Vuetify doesn't have built-in glassmorphism components. The design requires specific opacity values (`/70`, `/50`), blur amounts (`blur(20px)`, `blur(40px)`), and gradient overlays that are best expressed as raw CSS. We'll use CSS custom properties from `tokens.scss` for colors.

### Decision 5: Shimmer Button Effect

**Choice:** CSS-only shimmer using a `::before` pseudo-element with a translateX animation on hover.

**Rationale:** The Stitch design includes a `group-hover:animate-[shimmer_1.5s_infinite]` effect. This can be achieved with a pure CSS keyframe animation on a pseudo-element, no JS required.

## Visual Structure

```
┌──────────────────────────────────────┐
│  Dimmed Background (backdrop-blur)   │
│  ┌─ Abstract blur blobs (decorative) │
│  │                                   │
│  │  ┌─ Glass Card (rounded-2rem) ──┐│
│  │  │ Internal glow (decorative)   ││
│  │  │                              ││
│  │  │  ┌──────┐  下一地点：洗手间  ││
│  │  │  │ icon │                   ││
│  │  │  └──────┘  ⏱ 预计时间：3分钟 ││
│  │  │                              ││
│  │  │  ┌──────────────────────┐   ││
│  │  │  │     下一地点          │   ││
│  │  │  └──────────────────────┘   ││
│  │  └──────────────────────────────┘│
│  │                                   │
└──────────────────────────────────────┘
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| backdrop-filter performance on low-end devices | Acceptable — this is a static page, not animated |
| MDI icon differs visually from Material Symbols "straight" | Minor difference; icon semantics are the same (directional arrow) |
| Blur effects render differently across browsers | Test in Chrome/Firefox; Safari may need `-webkit-backdrop-filter` |
| Fixed viewport height may not match all devices | Use `100dvh` for dynamic viewport height support |

## Open Questions

1. **What MDI icon best replaces "straight"?** The Stitch design uses Material Symbols "straight" (a forward arrow). `mdi-arrow-right-bold` is the closest MDI equivalent. If the user prefers a different icon, it's a one-line change.
2. **Should the page have an AppHeader?** The design is a full-screen modal overlay — no header is shown. This is intentional; the modal assumes it overlays existing content.
