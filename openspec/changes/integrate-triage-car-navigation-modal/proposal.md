## Why

The Stitch design project "医院智能对话助手" contains a navigation modal screen ("智能导诊 - 开始导航弹窗 (Glassmorphism)") that was designed as part of the triage flow's final navigation step. This glassmorphism modal should be integrated into the current Vue 3 project as a new page at `/triage-car`, providing the visual foundation for the navigation-to-clinic experience. This is a static visual integration first — interactivity and state wiring will follow in a separate change.

## What Changes

- Create a new route `/triage-car` with page component `TriageCarPage.vue`
- Implement a full-screen glassmorphism navigation modal matching the Stitch design:
  - Dimmed/blurred background layer with abstract decorative blobs
  - Glassmorphism modal card with backdrop-blur, semi-transparent background, ghost border, and internal glow
  - Direction icon in a gradient circular container (using Vuetify MDI icons)
  - Destination label ("下一地点：洗手间") with primary color headline
  - Estimated time badge with clock icon in a frosted pill container
  - Gradient CTA button ("下一地点") with shimmer hover effect
- All styling uses existing Clinical Sanctuary design tokens — no new design dependencies
- No interactive logic — the page renders the static modal only

## Capabilities

### New Capabilities

- `triage-car-navigation-modal`: A new page at `/triage-car` displaying a glassmorphism navigation modal with destination info, time estimate, and action button, following the Stitch design spec

### Modified Capabilities

None. This is a purely additive change — no existing pages, components, or stores are modified.

## Impact

- **Files created**: `src/pages/TriageCarPage.vue`, route entry in `src/router/index.ts`
- **Files modified**: `src/router/index.ts` (add one route)
- **No API dependencies**
- **No new package dependencies** — uses existing Vuetify, MDI icons, and SCSS
- **No store modifications**
