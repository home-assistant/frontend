# @home-assistant/hac

Home Assistant Components (`hac-*`): framework-agnostic web components built
with [Lit](https://lit.dev).

> Work in progress, not published yet.

## Loading modes

Every component can be loaded in three ways:

| Import                               | Registers in         | Uses                                               |
| ------------------------------------ | -------------------- | -------------------------------------------------- |
| `@home-assistant/hac/<name>`         | Global registry      | The bundled copy. Used by Home Assistant itself.   |
| `@home-assistant/hac/<name>/scoped`  | Your scoped registry | The bundled copy, isolated from other copies.      |
| `@home-assistant/hac/<name>/dynamic` | Your scoped registry | Home Assistant's copy if compatible, else bundled. |

Global registration skips tag names that are already registered, so the first
registration wins and nothing throws.

### Global

```ts
import "@home-assistant/hac/card";
```

### Scoped and dynamic

Pass the component's elements to `ScopedElementsMixin` for Lit, or to
`createScopedElementRegistry` for plain custom elements. Switching between
`scoped` and `dynamic` only changes the import path. Forgetting the elements
is a TypeScript error, and a runtime error in plain JavaScript.

Lit:

```ts
import { LitElement, html } from "lit";
import { ScopedElementsMixin } from "@home-assistant/hac/scoped";
import { hacCardElements } from "@home-assistant/hac/card/dynamic";

class MyCard extends ScopedElementsMixin(LitElement, { ...hacCardElements }) {
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
} from "@home-assistant/hac/scoped";
import { hacCardElements } from "@home-assistant/hac/card/dynamic";

// Once per module, shared by all instances
const registry = createScopedElementRegistry({ ...hacCardElements });

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
`provideComponents()` from `@home-assistant/hac/provider`. It publishes only
versions and loaders, so nothing loads until a consumer asks.

Code that loads in parallel with the host, like Home Assistant's extra
modules, may ask before the host has published. The host prevents that race by
creating a pending slot in its HTML before any module loads; see
`HacProviderSlot` in `src/provider.ts`. Without a slot, `dynamic` uses the
bundled copy right away.

## Theming

Components read the Home Assistant theme variables when they are available
and fall back to built-in defaults otherwise. Each component also exposes its
own `--hac-*` custom properties, documented in its source.

## Structure

```
src/components/<group>/
  hac-<name>.ts   component classes, do not register themselves
  version.ts      version of the group, also exposed as `static version`
  global.ts       registers globally                 -> @home-assistant/hac/<group>
  scoped.ts       elements for a scoped registry     -> @home-assistant/hac/<group>/scoped
  dynamic.ts      host's or bundled copy, scoped     -> @home-assistant/hac/<group>/dynamic
  CHANGELOG.md    changes, by group version
```

A group holds one or more related components that share a version, like
`button` with `hac-button` and `hac-button-close`.

Bump `version.ts` and add a `CHANGELOG.md` entry with every change to a
group. A breaking change needs a new major version (minor in `0.x`), or
custom cards using `dynamic` would receive an incompatible copy.

### Dependencies

A component that renders other hac components in its shadow root lists them
in `static dependencies`, by tag name, and imports only their classes:

```ts
export class HacHeader extends LitElement {
  static readonly dependencies = { "hac-button-close": HacButtonClose };
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
group directory needs no `package.json` change. Only `global.ts` files and
`all.ts` have side effects, which `sideEffects` relies on for tree shaking.

## Development

```bash
pnpm --filter @home-assistant/hac build   # ESM + type declarations to dist/
pnpm --filter @home-assistant/hac dev     # rebuild on change
```

Inside this repository the app and gallery use the sources directly through
the `hac-source` export condition, so no build is needed during development.
The package is built with [Rslib](https://rslib.rs) in bundleless mode: every
source file becomes its own ES module.
