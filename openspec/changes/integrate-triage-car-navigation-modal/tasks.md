## 1. Route Registration

- [x] 1.1 Add `/triage-car` route to `src/router/index.ts` with lazy-loaded `TriageCarPage.vue`

## 2. Page Component — Background Layer

- [x] 2.1 Create `src/pages/TriageCarPage.vue` with `<v-main>` wrapper
- [x] 2.2 Implement dimmed background overlay with `backdrop-filter: blur(4px)` and semi-transparent surface background
- [x] 2.3 Add two decorative abstract blobs (primary-container and secondary-container colored circles with heavy blur)

## 3. Page Component — Glassmorphism Modal Card

- [x] 3.1 Implement centered modal card container with flexbox centering and z-50 elevation
- [x] 3.2 Style card: `max-w-[320px]`, `aspect-[4/3]`, `rounded-[2rem]`, `bg-surface-container-lowest/70`, `backdrop-blur-2xl`
- [x] 3.3 Add ghost border: `border` with `outline-variant` at 15% opacity
- [x] 3.4 Add internal glow effect: decorative circle with primary-container color at 20% opacity, blurred
- [x] 3.5 Apply ambient shadow matching design spec

## 4. Page Component — Top Section (Icon + Info)

- [x] 4.1 Create circular icon container (64px) with gradient background `from-primary to-primary-container`
- [x] 4.2 Add directional icon (`mdi-arrow-right-bold`) in white, filled style, 36px
- [x] 4.3 Add destination headline: "下一地点：洗手间" in Manrope bold, primary color, text-lg
- [x] 4.4 Add estimated time badge: frosted pill with `bg-surface-container-high/50`, `backdrop-blur-md`, ghost border
- [x] 4.5 Include clock icon (`mdi-clock-outline`) and text "预计时间：3分钟" inside badge

## 5. Page Component — CTA Button

- [x] 5.1 Create full-width gradient button with `rounded-full`, py-4, `from-primary to-primary-container`
- [x] 5.2 Style button text: "下一地点" in Manrope bold, white, text-base, tracking-wide
- [x] 5.3 Add `active:scale-[0.98]` press effect via CSS
- [x] 5.4 Implement shimmer hover effect: `::before` pseudo-element with white gradient, translateX animation on hover

## 6. Build Verification

- [x] 6.1 Run `pnpm build` to verify no TypeScript or build errors
- [x] 6.2 Run `pnpm dev` and visually verify the page at `/triage-car` matches the Stitch design screenshot
