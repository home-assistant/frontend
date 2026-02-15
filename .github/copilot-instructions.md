# GitHub Copilot & Claude Code Instructions

You are an assistant helping with development of the Home Assistant frontend. The frontend is built using Lit-based Web Components and TypeScript, providing a responsive and performant interface for home automation control.

**Note**: This file contains high-level guidelines and references to implementation patterns. For detailed component documentation, API references, and usage examples, refer to the `gallery/` directory.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Core Architecture](#core-architecture)
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
script/develop     # Development server
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
import { showAlertDialog } from "../dialogs/generic/show-alert-dialog";
```

## Core Architecture

The Home Assistant frontend is a modern web application that:

- Uses Web Components (custom elements) built with Lit framework
- Is written entirely in TypeScript with strict type checking
- Communicates with the backend via WebSocket API
- Provides comprehensive theming and internationalization

## Development Standards

### Code Quality Requirements

**Linting and Formatting (Enforced by Tools)**

- ESLint config extends Airbnb, TypeScript strict, Lit, Web Components, Accessibility
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
- **Follow Material Design**: Use Material Web Components where appropriate
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

## Component Library

### Dialog Components

**Available Dialog Types:**

- `ha-wa-dialog` - Preferred for new dialogs (Web Awesome based)
- `ha-dialog` - Legacy component (still widely used)

**Opening Dialogs (Fire Event Pattern - Recommended):**

```typescript
fireEvent(this, "show-dialog", {
  dialogTag: "dialog-example",
  dialogImport: () => import("./dialog-example"),
  dialogParams: { title: "Example", data: someData },
});
```

**Dialog Implementation Requirements:**

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

- Use `width` attribute with predefined sizes: `"small"` (320px), `"medium"` (560px - default), `"large"` (720px), or `"full"`
- Custom sizing is NOT recommended - use the standard width presets
- Example: `<ha-wa-dialog width="small">` for alert/confirmation dialogs

**Button Appearance Guidelines:**

- **Primary action buttons**: Default appearance (no appearance attribute) or omit for standard styling
- **Secondary action buttons**: Use `appearance="plain"` for cancel/dismiss actions
- **Destructive actions**: Use `appearance="filled"` for delete/remove operations (combined with appropriate semantic styling)
- **Button sizes**: Use `size="small"` (32px height) or default/medium (40px height)
- Always place primary action in `slot="primaryAction"` and secondary in `slot="secondaryAction"` within `ha-dialog-footer`

**Recent Examples:**

See these files for current patterns:

- `src/panels/config/repairs/dialog-repairs-issue.ts`
- `src/dialogs/restart/dialog-restart.ts`
- `src/panels/config/lovelace/resources/dialog-lovelace-resource-detail.ts`

**Gallery Documentation:**

- `gallery/src/pages/components/ha-wa-dialog.markdown`
- `gallery/src/pages/components/ha-dialogs.markdown`

### Form Component (ha-form)

- Schema-driven using `HaFormSchema[]`
- Supports entity, device, area, target, number, boolean, time, action, text, object, select, icon, media, location selectors
- Built-in validation with error display
- Use `dialogInitialFocus` in dialogs
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

**Gallery Documentation:**

- `gallery/src/pages/components/ha-form.markdown`

### Alert Component (ha-alert)

- Types: `error`, `warning`, `info`, `success`
- Properties: `title`, `alert-type`, `dismissable`, `icon`, `action`, `rtl`
- Content announced by screen readers when dynamically displayed

```html
<ha-alert alert-type="error">Error message</ha-alert>
<ha-alert alert-type="warning" title="Warning">Description</ha-alert>
<ha-alert alert-type="success" dismissable>Success message</ha-alert>
```

**Gallery Documentation:**

- `gallery/src/pages/components/ha-alert.markdown`

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
- **Gallery documentation**: `gallery/src/pages/components/ha-tooltip.markdown`

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

### Creating a Dialog

```typescript
@customElement("dialog-my-feature")
export class DialogMyFeature
  extends LitElement
  implements HassDialog<MyDialogParams>
{
  @property({ attribute: false })
  hass!: HomeAssistant;

  @state()
  private _params?: MyDialogParams;

  @state()
  private _open = false;

  public async showDialog(params: MyDialogParams): Promise<void> {
    this._params = params;
    this._open = true;
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this._params.title}
        header-subtitle=${this._params.subtitle}
        @closed=${this._dialogClosed}
      >
        <p>Dialog content</p>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button slot="primaryAction" @click=${this._submit}>
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  static styles = [haStyleDialog, css``];
}
```

### Dialog Design Guidelines

- Max width: 560px (Alert/confirmation: 320px fixed width)
- Close X-icon on top left (all screen sizes)
- Submit button grouped with cancel at bottom right
- Keep button labels short: "Save", "Delete", "Enable"
- Destructive actions use red warning button
- Always use a title (best practice)
- Strive for minimalism

#### Creating a Lovelace Card

**Purpose**: Cards allow users to tell different stories about their house (based on gallery)

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

### Common Pitfalls to Avoid

- Don't use `querySelector` - Use refs or component properties
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

When creating a pull request, you **must** use the PR template located at `.github/PULL_REQUEST_TEMPLATE.md`. Read the template file and use its full content as the PR body, filling in each section appropriately. Do not omit, reorder, or rewrite the template sections. Do not check the checklist items on behalf of the user — those are the user's responsibility to review and check. If the PR includes UI changes, remind the user to add screenshots or a short video to the PR after creating it.

### Text and Copy Guidelines

#### Terminology Standards

**Delete vs Remove** (Based on gallery/src/pages/Text/remove-delete-add-create.markdown)

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

- **Add translation keys**: All user-facing text must be translatable
- **Use placeholders**: Support dynamic content in translations
- **Keep context**: Provide enough context for translators

```typescript
// Good
this.hass.localize("ui.panel.config.automation.delete_confirm", {
  name: automation.alias,
});

// Bad - hardcoded text
("Are you sure you want to delete this automation?");
```

### Common Review Issues (From PR Analysis)

#### User Experience and Accessibility

- **Form validation**: Always provide proper field labels and validation feedback
- **Form accessibility**: Prevent password managers from incorrectly identifying fields
- **Loading states**: Show clear progress indicators during async operations
- **Error handling**: Display meaningful error messages when operations fail
- **Mobile responsiveness**: Ensure components work well on small screens
- **Hit targets**: Make clickable areas large enough for touch interaction
- **Visual feedback**: Provide clear indication of interactive states

#### Dialog and Modal Patterns

- **Dialog width constraints**: Respect minimum and maximum width requirements
- **Interview progress**: Show clear progress for multi-step operations
- **State persistence**: Handle dialog state properly during background operations
- **Cancel behavior**: Ensure cancel/close buttons work consistently
- **Form prefilling**: Use smart defaults but allow user override

#### Component Design Patterns

- **Terminology consistency**: Use "Join"/"Apply" instead of "Group" when appropriate
- **Visual hierarchy**: Ensure proper font sizes and spacing ratios
- **Grid alignment**: Components should align to the design grid system
- **Badge placement**: Position badges and indicators consistently
- **Color theming**: Respect theme variables and design system colors

#### Code Quality Issues

- **Null checking**: Always check if entities exist before accessing properties
- **TypeScript safety**: Handle potentially undefined array/object access
- **Import organization**: Remove unused imports and use proper type imports
- **Event handling**: Properly subscribe and unsubscribe from events
- **Memory leaks**: Clean up subscriptions and event listeners

#### Configuration and Props

- **Optional parameters**: Make configuration fields optional when sensible
- **Smart defaults**: Provide reasonable default values
- **Future extensibility**: Design APIs that can be extended later
- **Validation**: Validate configuration before applying changes

## Review Guidelines

### Core Requirements Checklist

- [ ] TypeScript strict mode passes (`yarn lint:types`)
- [ ] No ESLint errors or warnings (`yarn lint:eslint`)
- [ ] Prettier formatting applied (`yarn lint:prettier`)
- [ ] Lit analyzer passes (`yarn lint:lit`)
- [ ] Component follows Lit best practices
- [ ] Proper error handling implemented
- [ ] Loading states handled
- [ ] Mobile responsive
- [ ] Theme variables used
- [ ] Translations added
- [ ] Accessible to screen readers
- [ ] Tests added (where applicable)
- [ ] No console statements (use proper logging)
- [ ] Unused imports removed
- [ ] Proper naming conventions

### Text and Copy Checklist

- [ ] Follows terminology guidelines (Delete vs Remove, Create vs Add)
- [ ] Localization keys added for all user-facing text
- [ ] Uses "Home Assistant" (never "HA" or "HASS")
- [ ] Sentence case for ALL text (titles, headings, buttons, labels)
- [ ] American English spelling
- [ ] Friendly, informational tone
- [ ] Avoids abbreviations and jargon
- [ ] Correct terminology (integration not component)

### Component-Specific Checks

- [ ] Dialogs implement HassDialog interface
- [ ] Dialog styling uses haStyleDialog
- [ ] Dialog accessibility includes dialogInitialFocus
- [ ] ha-alert used correctly for messages
- [ ] ha-form uses proper schema structure
- [ ] Components handle all states (loading, error, unavailable)
- [ ] Entity existence checked before property access
- [ ] Event subscriptions properly cleaned up
