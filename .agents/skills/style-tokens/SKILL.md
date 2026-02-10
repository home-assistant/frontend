---
name: style-tokens
description: Apply Home Assistant CSS token styling. Use when choosing --ha-space-* spacing tokens, theme variables, responsive behavior, and RTL-safe component CSS.
---

### Styling Guidelines

- **Use CSS custom properties**: Leverage the theme system
- **Use spacing tokens**: Prefer `--ha-space-*` tokens over hardcoded values for consistent spacing
  - Spacing scale: `--ha-space-1` (4px) through `--ha-space-20` (80px) in 4px increments
  - Defined in `src/resources/theme/core.globals.ts`
  - Common values: `--ha-space-2` (8px), `--ha-space-4` (16px), `--ha-space-8` (32px)
- **Mobile-first responsive**: Design for mobile, enhance for desktop
- **Support RTL**: Ensure all layouts work in RTL languages

```typescript
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
