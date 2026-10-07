# @home-assistant/hac

Home Assistant Components (`hac-*`): framework-agnostic web components built
with [Lit](https://lit.dev).

> Work in progress, not published yet.

## Usage

Register the components you use through their entry points. Each one only
pulls in what it needs:

```ts
import "@home-assistant/hac/card"; // registers <hac-card>
import "@home-assistant/hac/header"; // registers <hac-header>
```

```html
<hac-card>
  <hac-header slot="header">
    Energy
    <span slot="subtitle">Configure your sources</span>
  </hac-header>
  <p>Content</p>
  <button slot="footer">Save</button>
</hac-card>
```

| Import                     | Registers elements | Use for                          |
| -------------------------- | ------------------ | -------------------------------- |
| `@home-assistant/hac/card` | `hac-card`         | Using one component              |
| `@home-assistant/hac/all`  | All components     | Prototypes, no bundler           |
| `@home-assistant/hac`      | None               | Classes and types, e.g. `extend` |

Registration skips tag names that are already registered. When Home Assistant
and a custom card both ship the library, the first registration wins and
nothing throws.

`lit` is a peer dependency.

## Theming

Components read the Home Assistant theme variables when they are available
and fall back to built-in defaults otherwise. Each component also exposes its
own `--hac-*` custom properties, documented in its source.

## Development

```bash
pnpm --filter @home-assistant/hac build   # ESM + type declarations to dist/
pnpm --filter @home-assistant/hac dev     # rebuild on change
```

Inside this repository the app and gallery use the sources directly through
the `hac-source` export condition, so no build is needed during development.

The package is built with [Rslib](https://rslib.rs) in bundleless mode: every
source file becomes its own ES module.

### Adding a component

1. Add `src/<name>/hac-<name>.ts` with the class. It must not register itself.
2. Add `src/<name>/define.ts` that registers it with `define()`.
3. Export the class from `src/index.ts` and the entry from `src/all.ts`.
4. Add a `./<name>` entry to `exports` in `package.json`, including the
   `hac-source` condition.

Only `define.ts` files and `all.ts` have side effects; `sideEffects` in
`package.json` relies on this to tree-shake everything else.
