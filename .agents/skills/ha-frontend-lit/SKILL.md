---
name: ha-frontend-lit
description: Home Assistant frontend Lit conventions. Use when working with reactive properties, internal state, DOM queries, lifecycle methods, or render-derived state.
---

# HA Frontend Lit

Use this skill when implementing or reviewing Lit component state, DOM access, lifecycle methods, or rendering behavior. Cross-load `ha-frontend-types` for Home Assistant data contracts, assertions, and lifecycle parameter types.

## Reactive Fields

This project currently uses Lit's TypeScript experimental decorators with `useDefineForClassFields: false`. Match existing declarations and do not introduce standard-decorator `accessor` syntax unless the project changes decorator mode.

- Use `@property()` for public reactive API and `@state()` for private reactive state.
- Prefer inferred types for initialized reactive fields when inference preserves the intended type; annotate when widening or an external contract requires it.

## DOM Queries

Prefer Lit's `@query()` or `@queryAll()` decorators for fixed selectors in the component's render root.

- Type the decorated field with the narrowest useful DOM or component interface.
- Keep the field optional when it may be absent at the point of access, including conditional rendering or pre-render lifecycle access.
- Use a definite assignment assertion only when every call site runs after the node is guaranteed to exist.
- The optional second argument to `@query()`, as in `@query("#target", true)`, caches the first query result. Use it only when later renders cannot replace the queried node.
- Use a direct query when the selector is dynamic or the target is outside the component's render root. Before querying a child, consider whether the required value belongs in parent state or data flow.

## Render-Derived State

- Prefer render-local values for inexpensive structures used only by that render.
- Assign a render-local value once when repeated evaluation is non-trivial or a local name improves clarity.
- Keep purely presentational derivations in `render()`. Use stored state or `willUpdate()` when the value must participate in lifecycle work, reflection, CSS, or non-render consumers.
- Use `memoizeOne` for pure, argument-derived transforms when stable input identity avoids meaningful repeated work. Keep inputs explicit and limited, and do not add caching without a credible benefit over computing the value directly.

## References

- [Reactive properties](https://lit.dev/docs/components/properties/)
- [Decorators](https://lit.dev/docs/components/decorators/)
- [Shadow DOM queries](https://lit.dev/docs/components/shadow-dom/#query)
- [Reactive update cycle](https://lit.dev/docs/components/lifecycle/)
