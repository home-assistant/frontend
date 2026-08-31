# Home Assistant Frontend Agent Guide

You are helping develop the Home Assistant frontend. This repository is a TypeScript application built from Lit-based Web Components for the Home Assistant web UI.

## Essential Commands

```bash
yarn lint          # ESLint + Prettier + TypeScript + Lit
yarn format        # Auto-fix ESLint + Prettier
yarn lint:types    # TypeScript compiler, run without file arguments
yarn test          # Vitest
yarn dev           # App dev server, supports --background/--status/--stop/--logs
yarn dev:serve     # Local serving dev server, supports -c core URL, -p port, and dev flags
```

Never run `tsc` or `yarn lint:types` with file arguments. When `tsc` receives file arguments, it ignores `tsconfig.json` and can emit `.js` files into `src/`. Always run `yarn lint:types` without arguments. For individual file type checking, rely on editor diagnostics.

## Architecture

- The frontend uses custom elements built with Lit and TypeScript strict mode.
- Components communicate with the backend through the Home Assistant WebSocket API.
- Use `ha-` for Home Assistant components, `hui-` for Lovelace UI components, and `dialog-` for dialogs.
- Prefer `ha-*` components and current Web Awesome wrappers. Avoid adding new legacy `mwc-*` usage.
- Leaf components should consume narrow Lit contexts instead of taking the broad `hass` object unless they are containers that own and provide `hass`.

## Development Standards

- Use strict TypeScript, proper interfaces, and `import type` for type-only imports.
- Avoid `any`; model data with existing Home Assistant types or narrow new types.
- Keep imports organized and remove unused imports.
- Do not use `console`; use existing logging or user-visible error patterns.
- Use `@state()` for internal Lit state and `@property()` for public API.
- Do not query or manipulate DOM manually when Lit decorators, component refs, or render state are appropriate.
- Scope styles to components, use theme custom properties, and keep layouts mobile-first and RTL-safe.
- All user-facing text must be localized through the translation system.
- Do not write tests just because you changed some code. Write a test when there is real logic that could break without anyone noticing, and explain what the test protects.

## Project Skills

Detailed guidance lives in project skills under `.agents/skills/`. Load the matching skill before detailed implementation or review:

- `ha-frontend-contexts`: Lit contexts, `hass` migration, and rerender-sensitive state access.
- `ha-frontend-components`: dialogs, forms, alerts, shortcuts, tooltips, panels, and Lovelace cards.
- `ha-frontend-events`: event handler typing, custom event dispatch, and event-map declarations.
- `ha-frontend-types`: backend data contracts, optional schemas, shared types, assertions, and lifecycle types.
- `ha-frontend-lit`: reactive fields, DOM queries, lifecycle behavior, and render-derived state.
- `ha-frontend-styling`: theme variables, spacing tokens, responsive layout, RTL, and view transitions.
- `ha-frontend-testing`: lint, typecheck, Vitest, Playwright e2e dev servers, and benchmarks.
- `ha-frontend-user-facing-text`: localization, terminology, sentence case, and Home Assistant text style.
- `ha-frontend-review`: PR template use, review checklist, and recurring review issues.
- `ha-frontend-gallery`: gallery pages, demos, sidebar structure, content, and verification.
- `ha-frontend-demo`: standalone demo structure, configurations, navigation, shared stubs, and verification.

## Pull Requests

When creating a pull request, use `.github/PULL_REQUEST_TEMPLATE.md` as the PR body. Preserve template sections, check only the appropriate type-of-change boxes, and do not check checklist items on behalf of the user. If the PR includes UI changes, remind the user to add screenshots or a short video.

## AI policy

This project follows the [Open Home Foundation AI Policy](AI_POLICY.md).
Autonomous contributions are not accepted: a human must review, understand,
and be able to explain every change before it is submitted. Do not open
issues or pull requests autonomously, and do not post comments on behalf of
a user without their review.
