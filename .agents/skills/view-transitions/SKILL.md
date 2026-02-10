---
name: view-transitions
description: Implement View Transitions API patterns. Use when adding withViewTransition(), view-transition-name, fallback behavior, and transition constraints.
---

### View Transitions

The View Transitions API creates smooth animations between DOM state changes. When implementing view transitions:

**Core Resources:**

- **Utility wrapper**: `src/common/util/view-transition.ts` - `withViewTransition()` function with graceful fallback
- **Real-world example**: `src/util/launch-screen.ts` - Launch screen fade pattern with browser support detection
- **Animation keyframes**: `src/resources/theme/animations.globals.ts` - Global `fade-in`, `fade-out`, `scale` animations
- **Animation duration**: `src/resources/theme/core.globals.ts` - `--ha-animation-base-duration` (350ms, respects `prefers-reduced-motion`)

**Implementation Guidelines:**

1. Always use `withViewTransition()` wrapper for automatic fallback
2. Keep transitions simple (subtle crossfades and fades work best)
3. Use `--ha-animation-base-duration` CSS variable for consistent timing
4. Assign unique `view-transition-name` to elements (must be unique at any given time)
5. For Lit components: Override `performUpdate()` or use `::part()` for internal elements

**Default Root Transition:**

By default, `:root` receives `view-transition-name: root`, creating a full-page crossfade. Target with [`::view-transition-group(root)`](https://developer.mozilla.org/en-US/docs/Web/CSS/::view-transition-group) to customize the default page transition.

**Important Constraints:**

- Each `view-transition-name` must be unique at any given time
- Only one view transition can run at a time
- **Shadow DOM incompatibility**: View transitions operate at document level and do not work within Shadow DOM due to style isolation ([spec discussion](https://github.com/w3c/csswg-drafts/issues/10303)). For web components, set `view-transition-name` on the `:host` element or use document-level transitions

**Current Usage & Planned Applications:**

- Launch screen fade out (implemented)
- Automation sidebar transitions (planned - #27238)
- More info dialog content changes (planned - #27672)
- Toolbar navigation, ha-spinner transitions (planned)

**Specification & Documentation:**

For browser support, API details, and current specifications, refer to these authoritative sources (note: check publication dates as specs evolve):

- [MDN: View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) - Comprehensive API reference
- [Chrome for Developers: View Transitions](https://developer.chrome.com/docs/web-platform/view-transitions) - Implementation guide and examples
- [W3C Draft Specification](https://drafts.csswg.org/css-view-transitions/) - Official specification (evolving)
