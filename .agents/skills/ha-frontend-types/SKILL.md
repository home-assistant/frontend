---
name: ha-frontend-types
description: Home Assistant frontend TypeScript conventions. Use when defining or reviewing backend data contracts, optional schemas, shared types, assertions, or Lit lifecycle types.
---

# HA Frontend Types

Use this skill for Home Assistant-specific TypeScript contracts and type choices.

## Home Assistant Data Contracts

Verify data contracts against the source that owns them, such as Home Assistant Core, Supervisor, a WebSocket handler, or an exported component type. Do not shape a type around assumptions made by its current frontend consumers.

- Match required, optional, nullable, and defaulted fields to the producer and runtime contract. Preserve optional configuration fields when omission is supported and has defined behavior.
- Use distinct request and response types when their wire shapes differ.
- When changing a shared contract, check affected consumers, tests, fixtures, and mocks.

## Reuse Home Assistant Contracts

- Reuse the canonical Home Assistant type when one exists. Define shared contract types in the data or API module that owns them.
- Reuse types exported by components and helpers rather than reconstructing their payloads. For event types, follow `ha-frontend-events`.
- When one domain contract is used across modules, define and export it from the module that owns that contract.

Prefer an existing owning contract. Introduce a frontend-specific type when the frontend shape or boundary genuinely differs.

## Assertions

Prefer accurate types and runtime narrowing. Use assertions or TypeScript suppressions at boundaries where the runtime invariant is understood but cannot be expressed cleanly; keep them narrow and explain non-obvious invariants.

## Lit Lifecycle Types

For Lit lifecycle methods that receive changed properties, use `PropertyValues<this>` when the method only needs public reactive properties:

```ts
protected willUpdate(changedProperties: PropertyValues<this>) {
  // ...
}
```

Use unparameterized `PropertyValues` when the method inspects private or protected reactive properties, which are not keys of `this`. Do not add assertions solely to retain `PropertyValues<this>`.

## Enforced Baseline

Use `import type` for type-only imports. This is enforced by the repository ESLint configuration.
