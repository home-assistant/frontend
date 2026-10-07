# @home-assistant/hac

Home Assistant Components (`hac-*`): framework-agnostic web components built
with [Lit](https://lit.dev).

> Work in progress, not published yet.

## Usage

Import only the components you use. Each import registers its custom elements,
so bundlers only include what is imported:

```ts
import "@home-assistant/hac/card";
import "@home-assistant/hac/header";
```

`import "@home-assistant/hac"` registers all components.

`lit` is a peer dependency.

## Development

```bash
pnpm --filter @home-assistant/hac build   # ESM + type declarations to dist/
pnpm --filter @home-assistant/hac dev     # rebuild on change
```

The package is built with [Rslib](https://rslib.rs) in bundleless mode: every
source file becomes its own ES module, which keeps tree shaking granular.
Modules that register custom elements are listed in `sideEffects`; keep that
list in sync when adding components.
