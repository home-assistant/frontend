# @home-assistant/components

Home Assistant Components (`hac-*`): framework-agnostic web components built
with [Lit](https://lit.dev).

> Work in progress, not published yet.

## Loading modes

Every element is imported on its own, in one of two ways:

| Import                                        | Registers in         | Uses                                             |
| --------------------------------------------- | -------------------- | ------------------------------------------------ |
| `@home-assistant/components/<element>`        | Global registry      | The bundled copy. Used by Home Assistant itself. |
| `@home-assistant/components/<element>/scoped` | Your scoped registry | The bundled copy, isolated from other copies.    |

`<element>` is the group, like `button` for `hac-button`, or the group and a
variant, like `button/close` for `hac-button-close`.

Global registration skips tag names that are already registered, so the first
registration wins and nothing throws.

### Global

```ts
import "@home-assistant/components/button";
import "@home-assistant/components/button/close";
```

### Scoped

Pass the component's elements to `ScopedElementsMixin` for Lit, or to
`createScopedElementRegistry` for plain custom elements. Forgetting the
elements is a TypeScript error, and a runtime error in plain JavaScript.

Lit:

```ts
import { LitElement, html } from "lit";
import { ScopedElementsMixin } from "@home-assistant/components/scoped";
import { hacCard } from "@home-assistant/components/card/scoped";

class MyCard extends ScopedElementsMixin(LitElement, [hacCard]) {
  render() {
    return html`<hac-card>…</hac-card>`;
  }
}
```

Plain custom elements:

```js
import {
  attachScopedShadow,
  createScopedElement,
  createScopedElementRegistry,
} from "@home-assistant/components/scoped";
import { hacCard } from "@home-assistant/components/card/scoped";

// Create the registry once, outside the class: all instances of the card share it
const registry = createScopedElementRegistry([hacCard]);

class MyCard extends HTMLElement {
  constructor() {
    super();
    const root = attachScopedShadow(this, { mode: "open" }, registry);
    root.innerHTML = "<hac-card>…</hac-card>";
    // or: root.append(createScopedElement(root, "hac-card"));
  }
}
```

`innerHTML`, `insertAdjacentHTML` and `createScopedElement` use the scoped
registry. `document.createElement` uses the global one, so avoid it for
scoped elements.

Scoped registries need native support (Chrome 146+, Safari 26) or
`@webcomponents/scoped-custom-element-registry`, which Home Assistant loads.
Without either, elements are registered globally instead, and an already
registered tag name keeps its existing class.

Only elements rendered inside the shadow root use the scoped registry. Light
DOM content, such as slotted elements, uses the registry of the tree it is
written in.

`lit` is a peer dependency.

### TypeScript

Each element's entry points declare its tag in `HTMLElementTagNameMap`, so
`document.querySelector("hac-card")` and templates are typed once the element
is imported. For the class itself, import its type from the `scoped` entry
point; `import type` loads nothing at runtime:

```ts
import type { HacCard } from "@home-assistant/components/card/scoped";
```

The package has no root entry point: each element and the scoped helpers
(`@home-assistant/components/scoped`) have their own.

## Theming

Components read the Home Assistant theme variables when they are available
and fall back to built-in defaults otherwise. Each component also exposes its
own `--hac-*` custom properties, documented in its source.

## Structure

Elements are organized in groups. A group's directory holds its default
element, and variants live in subdirectories, so the directories mirror the
import paths:

```
src/components/button/         <hac-button>        -> @home-assistant/components/button
  hac-button.ts                class, does not register itself
  info.ts                      tag name and version
  global.ts                    registers globally
  scoped.ts                    elements for a scoped registry  -> …/scoped
  close/                       <hac-button-close>  -> @home-assistant/components/button/close
    hac-button-close.ts
    info.ts, global.ts, scoped.ts
```

Shared code lives in `src/utils/`: `registration/` for defining elements
(global and scoped) and `element/` for helpers that components use
themselves, like slot checks.

A variant's tag name is `hac-<group>-<variant>`. `scoped` and `info` are
reserved and cannot be variant names.

Every element has its own version in `info.ts`.

### Dependencies

A component that renders other hac components in its shadow root lists them
in `static dependencies`, with the tag name from its `info.ts`, and imports
only their classes:

```ts
export class HacHeader extends LitElement {
  static readonly dependencies = [
    { tagName: BUTTON_CLOSE_TAG_NAME, element: HacButtonClose },
  ];
}
```

Never register a dependency yourself. The entry point decides where it goes:

- `global` registers dependencies globally, like the component. Inside Home
  Assistant everything stays in the global registry.
- `scoped` registers a variant of the component whose shadow root has its own
  registry with the bundled dependencies. Its internals never pick up another
  copy from the page.

Entry points are mapped with subpath patterns in `package.json`, so a new
element directory needs no `package.json` change. Only `global.ts` files have
side effects, which `sideEffects` relies on for tree shaking.

## Development

```bash
pnpm --filter @home-assistant/components build   # ESM + type declarations to dist/
pnpm --filter @home-assistant/components dev     # rebuild on change
```

Inside this repository the app uses the sources directly through
the `ha-source` export condition, so no build is needed during development.
The package is built with [Rslib](https://rslib.rs) in bundleless mode: every
source file becomes its own ES module.
