# GitHub Copilot & Claude Code Instructions

You are an assistant helping with development of the Home Assistant frontend. The frontend is built using Lit-based Web Components and TypeScript, providing a responsive and performant interface for home automation control.

**Note**: This file contains high-level guidelines and references to implementation patterns. For gallery-specific documentation, demos, page structure, and usage examples, see [`gallery/AGENTS.md`](gallery/AGENTS.md).

## Table of Contents

- [Quick Reference](#quick-reference)
- [Core Architecture](#core-architecture)
- [State Access: Contexts Instead of `hass`](#state-access-contexts-instead-of-hass)
- [Development Standards](#development-standards)
- [Component Library](#component-library)
- [Common Patterns](#common-patterns)
- [Text and Copy Guidelines](#text-and-copy-guidelines)
- [Development Workflow](#development-workflow)
- [Review Guidelines](#review-guidelines)

## Quick Reference

### Essential Commands

```bash
yarn lint          # ESLint + Prettier + TypeScript + Lit
yarn format        # Auto-fix ESLint + Prettier
yarn lint:types    # TypeScript compiler (run WITHOUT file arguments)
yarn test          # Vitest
yarn dev           # Development server
yarn dev:serve     # Development server with serve
```

> **WARNING:** Never run `tsc` or `yarn lint:types` with file arguments (e.g., `yarn lint:types src/file.ts`). When `tsc` receives file arguments, it ignores `tsconfig.json` and emits `.js` files into `src/`, polluting the codebase. Always run `yarn lint:types` without arguments. For individual file type checking, rely on IDE diagnostics. If `.js` files are accidentally generated, clean up with `git clean -fd src/`.

### Component Prefixes

- `ha-` - Home Assistant components
- `hui-` - Lovelace UI components
- `dialog-` - Dialog components

### Import Patterns

```typescript
import type { HomeAssistant } from "../types";
import { fireEvent } from "../common/dom/fire_event";
import { showAlertDialog } from "../dialogs/generic/show-dialog-box";
```

## Core Architecture

The Home Assistant frontend is a modern web application that:

- Uses Web Components (custom elements) built with Lit framework
- Is written entirely in TypeScript with strict type checking
- Communicates with the backend via WebSocket API
- Provides comprehensive theming and internationalization

## State Access: Contexts Instead of `hass`

Every component used to take the whole `hass: HomeAssistant` object — a god-object that re-renders on any unrelated `hass` change, forces tests to mock everything, and hides what a component actually reads. We're moving leaf components to **fine-grained [Lit context](https://lit.dev/docs/data/context/)**: consume only the slice you need and re-render only when it changes.

For new code, consume the matching context instead of adding a `hass` property. `hass` stays for container components that own it and feed the providers; the canonical migration is [`hui-button-card.ts`](src/panels/lovelace/cards/hui-button-card.ts). Infrastructure: contexts in [`src/data/context/index.ts`](src/data/context/index.ts), the `consume…` helpers in [`src/common/decorators/consume-context-entry.ts`](src/common/decorators/consume-context-entry.ts), and `@transform` in [`src/common/decorators/transform.ts`](src/common/decorators/transform.ts). Providers are wired automatically by `contextMixin` on `HassBaseEl` — you only consume.

### Contexts

Consume the narrowest context that covers your reads:

| Context                                                                 | Replaces                                                                                  |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `statesContext`                                                         | `hass.states`                                                                             |
| `entitiesContext` / `devicesContext` / `areasContext` / `floorsContext` | `hass.entities` / `.devices` / `.areas` / `.floors` (or `registriesContext` for all four) |
| `servicesContext`                                                       | `hass.services`                                                                           |
| `internationalizationContext`                                           | `hass.localize`, `hass.locale`, `hass.language`                                           |
| `formattersContext`                                                     | `hass.formatEntityName`, `hass.formatEntityState`, `hass.formatEntityAttributeName`, …    |
| `configContext`                                                         | `hass.config`, `hass.user`, `hass.auth`, `hass.userData`                                  |
| `connectionContext`                                                     | `hass.connection`, `hass.connected`, `hass.hassUrl`                                       |
| `apiContext`                                                            | `hass.callService`, `hass.callApi`, `hass.callWS`, `hass.sendWS`, `hass.fetchWithAuth`    |
| `uiContext`                                                             | `hass.themes`, `hass.selectedTheme`, `hass.panels`, `hass.dockedSidebar`, …               |
| `narrowViewportContext`                                                 | narrow-layout boolean                                                                     |

Lazy contexts (subscribe on first consumer, tear down after the last): `labelsContext`, `fullEntitiesContext`, `configEntriesContext`, `manifestsContext`. The single-field contexts (`localizeContext`, `themesContext`, `userContext`, …) are **deprecated** — use the grouped ones above.

### Consuming

Use the `consume…` helpers for entity-scoped and `localize` reads. `entityIdPath` is resolved against `this`, so these watch `this._config.entity`:

```ts
@state() @consumeEntityState({ entityIdPath: ["_config", "entity"] })
private _stateObj?: HassEntity; // consumeEntityStates(...) for a record of several

@state() @consumeEntityRegistryEntry({ entityIdPath: ["_config", "entity"] })
private _entity?: EntityRegistryDisplayEntry;

@state() @consumeLocalize()
private _localize!: LocalizeFunc;
```

For any other single field, pair `@consume` with `@transform`:

```ts
@state()
@consume({ context: uiContext, subscribe: true })
@transform<HomeAssistantUI, Themes>({ transformer: ({ themes }) => themes })
private _themes!: Themes;
```

`@transform`'s `watch` option re-runs the transformer when a host prop changes — needed when an entity id is computed, since `consumeEntityState` only watches the first path segment. To consume a whole group untransformed, drop `@transform` and type it `ContextType<typeof statesContext>`.

## Development Standards

### Code Quality Requirements

**Linting and Formatting (Enforced by Tools)**

- ESLint config (flat config) extends TypeScript strict, Lit, Web Components, Accessibility (lit-a11y), and import-x
- Prettier with ES5 trailing commas enforced
- No console statements (`no-console: "error"`) - use proper logging
- Import organization: No unused imports, consistent type imports

**Naming Conventions**

- PascalCase for types and classes
- camelCase for variables, methods
- Private methods require leading underscore
- Public methods forbid leading underscore

### TypeScript Usage

- **Always use strict TypeScript**: Enable all strict flags, avoid `any` types
- **Proper type imports**: Use `import type` for type-only imports
- **Define interfaces**: Create proper interfaces for data structures
- **Type component properties**: All Lit properties must be properly typed
- **No unused variables**: Prefix with `_` if intentionally unused
- **Consistent imports**: Use `@typescript-eslint/consistent-type-imports`

```typescript
// Good
import type { HomeAssistant } from "../types";

interface EntityConfig {
  entity: string;
  name?: string;
}

@property({ type: Object })
hass!: HomeAssistant;

// Bad
@property()
hass: any;
```

### Web Components with Lit

- **Use Lit 3.x patterns**: Follow modern Lit practices
- **Extend appropriate base classes**: Use `LitElement`, `SubscribeMixin`, or other mixins as needed
- **Define custom element names**: Use `ha-` prefix for components

```typescript
@customElement("ha-my-component")
export class HaMyComponent extends LitElement {
  @property({ attribute: false })
  hass!: HomeAssistant;

  @state()
  private _config?: MyComponentConfig;

  static get styles() {
    return css`
      :host {
        display: block;
      }
    `;
  }

  render() {
    return html`<div>Content</div>`;
  }
}
```

### Component Guidelines

- **Use composition**: Prefer composition over inheritance
- **Lazy load panels**: Heavy panels should be dynamically imported
- **Optimize renders**: Use `@state()` for internal state, `@property()` for public API
- **Handle loading states**: Always show appropriate loading indicators
- **Support themes**: Use CSS custom properties from theme

### Data Management

- **Use WebSocket API**: All backend communication via home-assistant-js-websocket
- **Prefer contexts over `hass`**: For state reads, consume the relevant Lit context instead of taking the whole `hass` object — see [State Access: Contexts Instead of `hass`](#state-access-contexts-instead-of-hass)
- **Cache appropriately**: Use collections and caching for frequently accessed data
- **Handle errors gracefully**: All API calls should have error handling
- **Update real-time**: Subscribe to state changes for live updates

```typescript
// Good
try {
  const result = await fetchEntityRegistry(this.hass.connection);
  this._processResult(result);
} catch (err) {
  showAlertDialog(this, {
    text: `Failed to load: ${err.message}`,
  });
}
```

### Styling Guidelines

- **Use CSS custom properties**: Leverage the theme system
- **Use spacing tokens**: Prefer `--ha-space-*` tokens over hardcoded values for consistent spacing
  - Spacing scale: `--ha-space-1` (4px) through `--ha-space-20` (80px) in 4px increments
  - Defined in `src/resources/theme/core.globals.ts`
  - Common values: `--ha-space-2` (8px), `--ha-space-4` (16px), `--ha-space-8` (32px)
- **Mobile-first responsive**: Design for mobile, enhance for desktop
- **Prefer `ha-*` components**: Build on the Home Assistant component library (many now wrap Web Awesome components); avoid new use of legacy Material Web Components (`mwc-*`), which are being phased out
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

### View Transitions

The View Transitions API creates smooth animations between DOM state changes. When implementing view transitions:

**Core Resources:**

- **Utility wrapper**: `src/common/util/view-transition.ts` - `withViewTransition()` function with graceful fallback
- **Real-world example**: `src/util/launch-screen.ts` - Launch screen fade pattern with browser support detection
- **Animation keyframes**: `src/resources/theme/animations.globals.ts` - Global `fade-in`, `fade-out`, `scale` animations
- **Animation duration**: `src/resources/theme/core.globals.ts` - `--ha-animation-duration-fast` (150ms), `--ha-animation-duration-normal` (250ms), `--ha-animation-duration-slow` (350ms) (all respect `prefers-reduced-motion`)

**Implementation Guidelines:**

1. Always use `withViewTransition()` wrapper for automatic fallback
2. Keep transitions simple (subtle crossfades and fades work best)
3. Use `--ha-animation-duration-*` CSS variables for consistent timing (`fast`, `normal`, `slow`)
4. Assign unique `view-transition-name` to elements (must be unique at any given time)
5. For Lit components: Override `performUpdate()` or use `::part()` for internal elements

**Default Root Transition:**

By default, `:root` receives `view-transition-name: root`, creating a full-page crossfade. Target with [`::view-transition-group(root)`](https://developer.mozilla.org/en-US/docs/Web/CSS/::view-transition-group) to customize the default page transition.

**Important Constraints:**

- Each `view-transition-name` must be unique at any given time
- Only one view transition can run at a time
- **Shadow DOM incompatibility**: View transitions operate at document level and do not work within Shadow DOM due to style isolation ([spec discussion](https://github.com/w3c/csswg-drafts/issues/10303)). For web components, set `view-transition-name` on the `:host` element or use document-level transitions

**Specification & Documentation:**

For browser support, API details, and current specifications, refer to these authoritative sources (note: check publication dates as specs evolve):

- [MDN: View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) - Comprehensive API reference
- [Chrome for Developers: View Transitions](https://developer.chrome.com/docs/web-platform/view-transitions) - Implementation guide and examples
- [W3C Draft Specification](https://drafts.csswg.org/css-view-transitions/) - Official specification (evolving)

### Performance Best Practices

- **Code split**: Split code at the panel/dialog level
- **Lazy load**: Use dynamic imports for heavy components
- **Optimize bundle**: Keep initial bundle size minimal
- **Use virtual scrolling**: For long lists, implement virtual scrolling
- **Memoize computations**: Cache expensive calculations

### Testing Requirements

- **Write tests**: Add tests for data processing and utilities
- **Test with Vitest**: Use the established test framework
- **Mock appropriately**: Mock WebSocket connections and API calls
- **Test accessibility**: Ensure components are accessible
- **Optimizing chart data processing**: When optimizing chart data transforms (history, statistics, energy, downsampling), follow the playbook in [`test/benchmarks/README.md`](test/benchmarks/README.md) — it has seeded fixtures, characterization (snapshot) tests that pin current output, and `vitest bench` benchmarks (`yarn test:bench`) for before/after comparison. Optimizations must keep output bit-identical.

## Component Library

### Dialog Component

**Opening Dialogs (Fire Event Pattern - Recommended):**

```typescript
fireEvent(this, "show-dialog", {
  dialogTag: "dialog-example",
  dialogImport: () => import("./dialog-example"),
  dialogParams: { title: "Example", data: someData },
});
```

**Dialog Implementation Requirements:**

- Use `ha-dialog` component
- Implement `HassDialog<T>` interface
- Use `@state() private _open = false` to control dialog visibility
- Set `_open = true` in `showDialog()`, `_open = false` in `closeDialog()`
- Return `nothing` when no params (loading state)
- Fire `dialog-closed` event in `_dialogClosed()` handler
- Use `header-title` attribute for simple titles
- Use `header-subtitle` attribute for simple subtitles
- Use slots for custom content where the standard attributes are not enough
- Use `ha-dialog-footer` with `primaryAction`/`secondaryAction` slots for footer content
- Add `autofocus` to first focusable element (e.g., `<ha-form autofocus>`). The component may need to forward this attribute internally.

**Dialog Sizing:**

- Use `width` attribute with predefined sizes: `"small"` (320px), `"medium"` (580px - default), `"large"` (1024px), or `"full"`
- Custom sizing is NOT recommended - use the standard width presets

**Button Appearance Guidelines:**

`ha-button` (wraps the Web Awesome button — see `src/components/ha-button.ts`) has two independent axes plus size:

- **`variant`** (color): `"brand"` (default), `"neutral"`, `"danger"`, `"warning"`, `"success"`
- **`appearance`** (fill style): `"accent"`, `"filled"`, `"outlined"`, `"plain"`
- **`size`**: `"xs"` (extra small, 40px), `"s"` (small, 32px), `"m"` (medium, 40px - default), `"l"` (large, 48px), `"xl"` (extra large, 40px)

Common patterns:

- **Primary action**: `appearance="filled"` for emphasis (or the default appearance for a lighter look)
- **Secondary action**: `appearance="plain"` for cancel/dismiss actions
- **Destructive actions**: `variant="danger"` for delete/remove operations (the generic confirmation dialog uses `variant="danger"` for its confirm button — see `src/dialogs/generic/dialog-box.ts`)
- Always place primary action in `slot="primaryAction"` and secondary in `slot="secondaryAction"` within `ha-dialog-footer`

### Form Component (ha-form)

- Schema-driven using `HaFormSchema[]`
- Supports entity, device, area, target, number, boolean, time, action, text, object, select, icon, media, location selectors
- Built-in validation with error display
- Use `computeLabel`, `computeError`, `computeHelper` for translations

```typescript
<ha-form
  .hass=${this.hass}
  .data=${this._data}
  .schema=${this._schema}
  .error=${this._errors}
  .computeLabel=${(schema) => this.hass.localize(`ui.panel.${schema.name}`)}
  @value-changed=${this._valueChanged}
></ha-form>
```

### Alert Component (ha-alert)

- Types: `error`, `warning`, `info`, `success`
- Properties: `title`, `alert-type`, `dismissable`, `narrow`
- Slots: `icon` (override the leading icon), `action` (custom action content)
- Content announced by screen readers when dynamically displayed

```html
<ha-alert alert-type="error">Error message</ha-alert>
<ha-alert alert-type="warning" title="Warning">Description</ha-alert>
<ha-alert alert-type="success" dismissable>Success message</ha-alert>
```

### Keyboard Shortcuts (ShortcutManager)

The `ShortcutManager` class provides a unified way to register keyboard shortcuts with automatic input field protection.

**Key Features:**

- Automatically blocks shortcuts when input fields are focused
- Prevents shortcuts during text selection (configurable via `allowWhenTextSelected`)
- Supports both character-based and KeyCode-based shortcuts (for non-latin keyboards)

**Implementation:**

- **Class definition**: `src/common/keyboard/shortcuts.ts`
- **Real-world example**: `src/state/quick-bar-mixin.ts` - Global shortcuts (e, c, d, m, a, Shift+?) with non-latin keyboard fallbacks

### Tooltip Component (ha-tooltip)

The `ha-tooltip` component wraps Web Awesome tooltip with Home Assistant theming. Use for providing contextual help text on hover.

**Implementation:**

- **Component definition**: `src/components/ha-tooltip.ts`
- **Usage example**: `src/components/ha-label.ts`

## Common Patterns

### Creating a Panel

```typescript
@customElement("ha-panel-myfeature")
export class HaPanelMyFeature extends SubscribeMixin(LitElement) {
  @property({ attribute: false })
  hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true })
  narrow!: boolean;

  @property()
  route!: Route;

  hassSubscribe() {
    return [
      subscribeEntityRegistry(this.hass.connection, (entities) => {
        this._entities = entities;
      }),
    ];
  }
}
```

#### Creating a Lovelace Card

**Purpose**: Cards allow users to tell different stories about their house.

```typescript
@customElement("hui-my-card")
export class HuiMyCard extends LitElement implements LovelaceCard {
  @property({ attribute: false })
  hass!: HomeAssistant;

  @state()
  private _config?: MyCardConfig;

  public setConfig(config: MyCardConfig): void {
    if (!config.entity) {
      throw new Error("Entity required");
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 3; // Height in grid units
  }

  // Optional: Editor for card configuration
  public static getConfigElement(): LovelaceCardEditor {
    return document.createElement("hui-my-card-editor");
  }

  // Optional: Stub config for card picker
  public static getStubConfig(): object {
    return { entity: "" };
  }
}
```

**Card Guidelines:**

- Cards are highly customizable for different households
- Implement `LovelaceCard` interface with `setConfig()` and `getCardSize()`
- Use proper error handling in `setConfig()`
- Consider all possible states (loading, error, unavailable)
- Support different entity types and states
- Follow responsive design principles
- Add configuration editor when needed

### Internationalization

- **Use localize**: Always use the localization system
- **Add translation keys**: Add keys to src/translations/en.json
- **Support placeholders**: Use proper placeholder syntax

```typescript
this.hass.localize("ui.panel.config.updates.update_available", {
  count: 5,
});
```

### Accessibility

- **ARIA labels**: Add appropriate ARIA labels
- **Keyboard navigation**: Ensure all interactions work with keyboard
- **Screen reader support**: Test with screen readers
- **Color contrast**: Meet WCAG AA standards

## Development Workflow

### Setup and Commands

1. **Setup**: `script/setup` - Install dependencies
2. **Develop**: `script/develop` - Development server
3. **Lint**: `yarn lint` - Run all linting before committing
4. **Test**: `yarn test` - Add and run tests
5. **Build**: `script/build_frontend` - Test production build

### End-to-end (e2e) tests

The e2e suites run with Playwright, each on its own port. Each suite has a matching dev server, and you must start it first. Playwright reuses a dev server that is already listening on the suite's port (`reuseExistingServer` locally) and starts testing right away; if none is running it falls back to a slow full production build. The rspack watcher recompiles on save, so once a server is up you can re-run the suite without restarting it.

Start the suite's dev server, then run the suite:

- **App** (8095): `yarn test:e2e:app:dev`, then `yarn test:e2e:app`
- **Demo** (8090): `yarn dev:demo`, then `yarn test:e2e:demo`
- **Gallery** (8100): `yarn dev:gallery`, then `yarn test:e2e:gallery`

Each of these dev-server commands runs in the foreground. For unattended or agent use, append `--background`: it waits until the server is serving, prints the URL and pid, then detaches so you can run the suite in the same shell. When a coding agent is detected (via environment markers), `--background` turns on automatically; set `HA_DEV_BACKGROUND=0` to force foreground. Manage the detached server with `--status`, `--stop`, and `--logs` (for example `yarn dev:demo --stop`). Reuse and stop key off a `/__ha_dev_status` health check, so a stray program on the same port is never mistaken for the dev server and starting or stopping twice is harmless.

The app suite runs against a stripped-down harness app built only for e2e; demo and gallery run against their normal dev servers, so `yarn dev:demo` and `yarn dev:gallery` are thin wrappers around `demo/script/develop_demo` and `gallery/script/develop_gallery`.

Add `-g "<title>" --project=chromium` to narrow a run. `yarn test:e2e` runs all three.

Run the suite directly; don't pipe it through `tail`/`head`, which hides Playwright's progress and truncates results.

### Gallery

For Gallery-specific structure, page/demo naming, sidebar behavior, content standards, and commands, see [`gallery/AGENTS.md`](gallery/AGENTS.md).

### Common Pitfalls to Avoid

- Don't manually query the DOM with `querySelector` - use the `@query`/`@queryAll` decorators or component properties
- Don't manipulate DOM directly - Let Lit handle rendering
- Don't use global styles - Scope styles to components
- Don't block the main thread - Use web workers for heavy computation
- Don't ignore TypeScript errors - Fix all type issues

### Security Best Practices

- Sanitize HTML - Never use `unsafeHTML` with user content
- Validate inputs - Always validate user inputs
- Use HTTPS - All external resources must use HTTPS
- CSP compliance - Ensure code works with Content Security Policy

### Pull Requests

When creating a pull request, you **must** use the PR template located at `.github/PULL_REQUEST_TEMPLATE.md`. Read the template file and use its full content as the PR body, filling in each section appropriately.

- Do not omit, reorder, or rewrite the template sections
- Check the appropriate "Type of change" box based on the changes
- Do not check the checklist items on behalf of the user — those are the user's responsibility to review and check
- If the PR includes UI changes, remind the user to add screenshots or a short video to the PR after creating it
- Be simple and user friendly — explain what the change does, not implementation details
- Use markdown so the user can copy it

### Text and Copy Guidelines

#### Terminology Standards

**Delete vs Remove**

- **Use "Remove"** for actions that can be restored or reapplied:
  - Removing a user's permission
  - Removing a user from a group
  - Removing links between items
  - Removing a widget from dashboard
  - Removing an item from a cart
- **Use "Delete"** for permanent, non-recoverable actions:
  - Deleting a field
  - Deleting a value in a field
  - Deleting a task
  - Deleting a group
  - Deleting a permission
  - Deleting a calendar event

**Create vs Add** (Create pairs with Delete, Add pairs with Remove)

- **Use "Add"** for already-existing items:
  - Adding a permission to a user
  - Adding a user to a group
  - Adding links between items
  - Adding a widget to dashboard
  - Adding an item to a cart
- **Use "Create"** for something made from scratch:
  - Creating a new field
  - Creating a new task
  - Creating a new group
  - Creating a new permission
  - Creating a new calendar event

#### Writing Style (Consistent with Home Assistant Documentation)

- **Use American English**: Standard spelling and terminology
- **Friendly, informational tone**: Be inspiring, personal, comforting, engaging
- **Address users directly**: Use "you" and "your"
- **Be inclusive**: Objective, non-discriminatory language
- **Be concise**: Use clear, direct language
- **Be consistent**: Follow established terminology patterns
- **Use active voice**: "Delete the automation" not "The automation should be deleted"
- **Avoid jargon**: Use terms familiar to home automation users

#### Language Standards

- **Always use "Home Assistant"** in full, never "HA" or "HASS"
- **Avoid abbreviations**: Spell out terms when possible
- **Use sentence case everywhere**: Titles, headings, buttons, labels, UI elements
  - ✅ "Create new automation"
  - ❌ "Create New Automation"
  - ✅ "Device settings"
  - ❌ "Device Settings"
- **Oxford comma**: Use in lists (item 1, item 2, and item 3)
- **Replace Latin terms**: Use "like" instead of "e.g.", "for example" instead of "i.e."
- **Avoid CAPS for emphasis**: Use bold or italics instead
- **Write for all skill levels**: Both technical and non-technical users

#### Key Terminology

- **"integration"** (preferred over "component")
- **Technical terms**: Use lowercase (automation, entity, device, service)

#### Translation Considerations

All user-facing text must be translatable — see the **Internationalization** section (under Common Patterns) for the `localize` API and placeholder usage. From a copy perspective:

- **Keep context**: Provide enough context for translators
- **Avoid concatenation**: Prefer full localized strings with placeholders over stitching translated fragments together

### Common Review Issues (From PR Analysis)

Recurring, easy-to-miss problems surfaced in real PR reviews. These complement the standards above rather than repeating them — items already covered earlier (loading states, error handling, mobile layout, theming, import hygiene) are intentionally not duplicated here.

#### User Experience and Accessibility

- **Form validation**: Always provide proper field labels and validation feedback
- **Form accessibility**: Prevent password managers from incorrectly identifying fields
- **Hit targets**: Make clickable areas large enough for touch interaction
- **Visual feedback**: Provide clear indication of interactive states (hover, active, focus)

#### Dialog and Modal Patterns

- **Interview progress**: Show clear progress for multi-step operations
- **State persistence**: Handle dialog state properly during background operations
- **Cancel behavior**: Ensure cancel/close buttons work consistently
- **Form prefilling**: Use smart defaults but allow user override

#### Component Design Patterns

- **Terminology consistency**: Use "Join"/"Apply" instead of "Group" when appropriate
- **Visual hierarchy**: Ensure proper font sizes and spacing ratios
- **Grid alignment**: Components should align to the design grid system
- **Badge placement**: Position badges and indicators consistently

#### Code Quality Issues

- **Null checking**: Always check if entities exist before accessing properties
- **TypeScript safety**: Handle potentially undefined array/object access
- **Event handling and cleanup**: Subscribe/unsubscribe correctly and remove listeners to avoid memory leaks

#### Configuration and Props

- **Optional parameters**: Make configuration fields optional when sensible
- **Smart defaults**: Provide reasonable default values
- **Future extensibility**: Design APIs that can be extended later
- **Validation**: Validate configuration before applying changes

## Review Guidelines

Final pre-submission checklist. Linting and formatting are enforced by tooling, so this focuses on what tools can't catch rather than restating every rule above.

- [ ] `yarn lint` passes (TypeScript, ESLint, Prettier, Lit analyzer) and `yarn test` is green
- [ ] Tests added for new data processing/utilities (where applicable)
- [ ] All user-facing text is localized and follows the Text and Copy guidelines (sentence case, "Home Assistant" in full, Delete/Remove + Create/Add)
- [ ] Components handle all states (loading, error, unavailable)
- [ ] Entity existence checked before property access
- [ ] Event/subscription listeners cleaned up (no memory leaks)
- [ ] Accessible to screen readers and keyboard
