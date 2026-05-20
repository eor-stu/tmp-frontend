# Triage Car Navigation Modal

A full-screen glassmorphism navigation modal page at `/triage-car` showing destination guidance with icon, time estimate, and action button.

## Route

- **Path:** `/triage-car`
- **Name:** `triage-car`
- **Component:** `@/pages/TriageCarPage.vue` (lazy-loaded)

## Visual Specification

### Background Layer

- Full viewport overlay with `backdrop-filter: blur(4px)` applied to a semi-transparent surface background
- Two decorative abstract circles positioned absolutely:
  - Top-left: `bg-primary-container` at 30% opacity, large blur (80px)
  - Bottom-right: `bg-secondary-container` at 30% opacity, large blur (100px)

### Modal Card

- Centered in viewport using flexbox (`items-center justify-center`)
- Max width: 320px, aspect ratio: 4/3
- Background: `surface-container-lowest` at 70% opacity
- Backdrop filter: `blur(40px)` (glassmorphism)
- Border radius: 2rem (32px)
- Border: 1px solid `outline-variant` at 15% opacity (ghost border)
- Shadow: `0 20px 40px -15px rgba(24, 28, 29, 0.06)` (ambient, tinted)
- Internal glow: decorative circle at top-right, `primary-container` at 20% opacity, 40px blur, behind content (z-index: -10)

### Top Section (Icon + Info)

Layout: horizontal flex, gap 20px, aligned to start, with top margin.

**Direction Icon Container:**
- 64x64px circular container (`rounded-full`)
- Background: `linear-gradient(135deg, primary, primary-container)`
- Shadow: `0 8px 16px -4px rgba(0, 107, 96, 0.3)` (tinted)
- Icon: `mdi-arrow-right-bold`, 36px, white (`on-primary`), filled style (`font-variation-settings: 'FILL' 1`)

**Text Info Column:**
- Vertical flex, gap 8px

**Destination Headline:**
- Text: "下一地点：洗手间"
- Font: Manrope, bold (700), text-lg (1.125rem)
- Color: primary
- Letter spacing: -0.02em
- Line height: tight (1.25)

**Time Estimate Badge:**
- Inline flex row, gap 6px, padding 6px 12px
- Background: `surface-container-high` at 50% opacity
- Backdrop filter: `blur(12px)`
- Border radius: full (9999px)
- Border: 1px solid `outline-variant` at 10% opacity
- Content: clock icon (`mdi-clock-outline`, 16px, `on-surface-variant`) + text "预计时间：3分钟" (label-sm, `on-surface-variant`, medium weight)

### CTA Button

- Full width, margin-top: 24px, padding: 16px vertical
- Border radius: full (9999px)
- Background: `linear-gradient(135deg, primary, primary-container)`
- Text: "下一地点", Manrope bold, text-base, white (`on-primary`), letter spacing: 0.02em
- Shadow: `0 8px 20px -6px rgba(0, 107, 96, 0.4)` (tinted)
- Active state: `transform: scale(0.98)`
- Border: 1px solid `surface-container-lowest` at 20% opacity (top highlight)

**Shimmer Effect (hover):**
- Pseudo-element `::before` with gradient `transparent → white/20% → transparent`
- Initially translated -100% on X axis
- On parent hover: animate to translateX(100%) over 1.5s, infinite loop
- Overflow hidden on button to clip the shimmer

## Design Tokens Used

| Token | Value |
|-------|-------|
| `--color-primary` | `#00606d` |
| `--color-primary-container` | `#007b8b` |
| `--color-secondary-container` | `#8bf1e6` |
| `--color-on-primary` | `#ffffff` |
| `--color-on-surface-variant` | `#3e494b` |
| `--color-surface-container-lowest` | `#ffffff` |
| `--color-surface-container-high` | `#e5e9ea` |
| `--color-outline-variant` | `#bdc8cb` |

## Non-Goals (for this change)

- No click handlers on the CTA button
- No dynamic data — all text is hardcoded
- No connection to conversation state or API
- No entrance animation (static render)
- No dark mode variant
