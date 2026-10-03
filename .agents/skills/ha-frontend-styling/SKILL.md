---
name: ha-frontend-styling
description: Home Assistant frontend styling, theming, spacing, responsive layout, RTL, and View Transitions guidance. Use when editing CSS, layout, motion, or visual component structure.
---

# HA Frontend Styling

Use this skill when editing CSS, layout, visual hierarchy, theme integration, responsive behavior, RTL support, or view transitions.

## Theme And Layout Basics

- Use Home Assistant CSS custom properties instead of hardcoded colors.
- Use `--ha-space-*` spacing tokens instead of hardcoded spacing where possible.
- Keep components mobile-first and enhance for desktop.
- Keep layouts RTL-safe. Prefer logical properties when they fit.
- Prefer `ha-*` components and current Web Awesome wrappers.
- Avoid adding new legacy Material Web Components (`mwc-*`).
- Scope styles to the component. Do not rely on global styles for component internals.

Spacing tokens are defined in `src/resources/theme/core.globals.ts`. The scale runs from `--ha-space-1` at 4px through `--ha-space-20` at 80px in 4px increments. Common values are `--ha-space-2` at 8px, `--ha-space-4` at 16px, and `--ha-space-8` at 32px.

```ts
static get styles() {
  return css`
    :host {
      padding: var(--ha-space-4);
      color: var(--primary-text-color);
      background-color: var(--card-background-color);
    }

    .content {
      gap: var(--ha-space-2);
    }

    @media (max-width: 600px) {
      :host {
        padding: var(--ha-space-2);
      }
    }
  `;
}
```

## Interaction States

- Make touch targets large enough for mobile.
- Provide clear hover, active, focus, disabled, loading, error, and unavailable states.
- Preserve keyboard navigation and visible focus indicators.
- Maintain WCAG AA contrast for text and essential UI affordances.

## View Transitions

Use the View Transitions API only for meaningful continuity between DOM states.

Core resources:

- Utility wrapper: `src/common/util/view-transition.ts`, `withViewTransition()`.
- Launch-screen fade example: `src/util/launch-screen.ts`.
- Animation keyframes: `src/resources/theme/animations.globals.ts`.
- Animation duration tokens: `src/resources/theme/core.globals.ts`.

Implementation rules:

- Use `withViewTransition()` for fallback behavior.
- Keep transitions simple. Subtle fades and crossfades usually work best.
- Use `--ha-animation-duration-fast`, `--ha-animation-duration-normal`, or `--ha-animation-duration-slow` for timing.
- Ensure each `view-transition-name` is unique at any given time.
- Remember only one view transition can run at a time.
- View transitions operate at document level and do not work inside Shadow DOM style isolation. For web components, set `view-transition-name` on `:host` or use document-level transitions.
- The root gets `view-transition-name: root` by default. Target `::view-transition-group(root)` to customize the default page transition.

## Review Checklist

- Styling uses theme variables and spacing tokens where practical.
- Layout is mobile-first and RTL-safe.
- Component styles are scoped.
- Interactive states are clear and accessible.
- Motion is subtle, tokenized, and respects reduced-motion behavior through existing globals.
