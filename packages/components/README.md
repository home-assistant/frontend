# @home-assistant/components

Home Assistant Components (`hac-*`): framework-agnostic web components built
with [Lit](https://lit.dev).

> Work in progress, not published yet.

## Loading modes

Every element is imported on its own, in one of three ways:

| Import                                         | Registers in         | Uses                                               |
| ---------------------------------------------- | -------------------- | -------------------------------------------------- |
| `@home-assistant/components/<element>`         | Global registry      | The bundled copy. Used by Home Assistant itself.   |
| `@home-assistant/components/<element>/scoped`  | Your scoped registry | The bundled copy, isolated from other copies.      |
| `@home-assistant/components/<element>/dynamic` | Your scoped registry | Home Assistant's copy if compatible, else bundled. |

`<element>` is the group, like `button` for `hac-button`, or the group and a
variant, like `button/close` for `hac-button-close`.

Global registration skips tag names that are already registered, so the first
registration wins and nothing throws.

### Global

```ts
import "@home-assistant/components/button";
import "@home-assistant/components/button/close";
```

### Scoped and dynamic

Pass the component's elements to `ScopedElementsMixin` for Lit, or to
`createScopedElementRegistry` for plain custom elements. Switching between
`scoped` and `dynamic` only changes the import path. Forgetting the elements
is a TypeScript error, and a runtime error in plain JavaScript.

Lit:

```ts
import { LitElement, html } from "lit";
import { ScopedElementsMixin } from "@home-assistant/components/scoped";
import { hacCard } from "@home-assistant/components/card/dynamic";

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
import { hacCard } from "@home-assistant/components/card/dynamic";

// Once per module, shared by all instances
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

With `dynamic`, the element renders right away and upgrades once the class is
known. Home Assistant's copy is used when its version is compatible with the
bundled one: same major version and at least the same minor and patch (for
`0.x` versions the minor version must match).

`dynamic` imports only the element's version up front. The bundled copy is a
dynamic import, which bundlers split into a separate chunk that is only
downloaded when Home Assistant cannot provide a compatible copy. Builds that
inline dynamic imports into a single file still work, but then always contain
the bundled copy.

Scoped registries need native support (Chrome 146+, Safari 26) or
`@webcomponents/scoped-custom-element-registry`, which Home Assistant loads.
Without either, elements are registered globally instead, and an already
registered tag name keeps its existing class.

Only elements rendered inside the shadow root use the scoped registry. Light
DOM content, such as slotted elements, uses the registry of the tree it is
written in.

`lit` is a peer dependency.

## Providing components (host apps)

A host app such as Home Assistant publishes the components it can share with
`provideComponents()` from `@home-assistant/components/provider`. It publishes only
versions and loaders, so nothing loads until a consumer asks.

The host publishes its list as early as possible. A consumer that asks before
that, which is rare, uses its bundled copies.

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
  info.ts                      tag name and version, all `dynamic` loads up front
  global.ts                    registers globally
  scoped.ts                    elements for a scoped registry  -> …/scoped
  dynamic.ts                   host's or bundled copy, scoped  -> …/dynamic
  CHANGELOG.md                 changes, by version
  close/                       <hac-button-close>  -> @home-assistant/components/button/close
    hac-button-close.ts
    info.ts, global.ts, scoped.ts, dynamic.ts, CHANGELOG.md
```

Shared code lives in `src/utils/`: `registration/` for defining elements
(global, scoped and dynamic) and `element/` for helpers that components use
themselves, like slot checks.

A variant's tag name is `hac-<group>-<variant>`. `scoped`, `dynamic` and
`info` are reserved and cannot be variant names.

Every element has its own version. Bump `VERSION` in `info.ts` and add a `CHANGELOG.md`
entry with every change to an element. A breaking change needs a new major
version (minor in `0.x`), or custom cards using `dynamic` would receive an
incompatible copy.

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
- `scoped` and `dynamic` (when the bundled copy is used) register a variant of
  the component whose shadow root has its own registry with the bundled
  dependencies. Its internals never pick up another copy from the page.

With `dynamic`, a component and its dependencies always come from the same
place: Home Assistant's header uses Home Assistant's close button, the
bundled header the bundled one.

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
