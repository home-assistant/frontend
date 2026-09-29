---
name: ha-frontend-contexts
description: Home Assistant frontend Lit context and hass migration guidance. Use when adding or changing component state access, replacing hass reads, consuming entity or registry contexts, or reviewing rerender behavior.
---

# HA Frontend Contexts

Use this skill when a component reads Home Assistant state, registries, localization, services, config, UI data, connection state, or API helpers.

## Goal

Move leaf components away from the broad `hass: HomeAssistant` object. Broad `hass` access rerenders components for unrelated changes, hides the data a component depends on, and makes tests harder to mock.

Container components may keep `hass` when they own it and feed providers. Leaf components should consume the narrowest context that covers their reads.

## Core Files

- Context definitions: `src/data/context/index.ts`
- `consume` decorator and `ContextSubscriptionController`: `src/common/decorators/consume.ts` (use instead of `@lit/context`'s `consume` and `ContextConsumer`, enforced by ESLint)
- Entity-scoped consume helpers: `src/common/decorators/consume-context-entry.ts`
- Transform decorator: `src/common/decorators/transform.ts`
- Canonical migration example: `src/panels/lovelace/cards/hui-button-card.ts`
- Providers are wired by `contextMixin` on `HassBaseEl`; consumers do not wire providers manually.

## Context Selection

| Context                                                              | Replaces                                                                                                  |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `statesContext`                                                      | `hass.states`                                                                                             |
| `entitiesContext`, `devicesContext`, `areasContext`, `floorsContext` | `hass.entities`, `hass.devices`, `hass.areas`, `hass.floors`                                              |
| `registriesContext`                                                  | all four registries together                                                                              |
| `servicesContext`                                                    | `hass.services`                                                                                           |
| `internationalizationContext`                                        | `hass.localize`, `hass.locale`, `hass.language`                                                           |
| `formattersContext`                                                  | entity and attribute formatters                                                                           |
| `configContext`                                                      | `hass.config`, `hass.user`, `hass.auth`, `hass.userData`                                                  |
| `connectionContext`                                                  | `hass.connection`, `hass.connected`, `hass.debugConnection`, `hass.hassUrl`                               |
| `apiContext`                                                         | `hass.callService`, `hass.callApi`, `hass.callApiRaw`, `hass.callWS`, `hass.sendWS`, `hass.fetchWithAuth` |
| `uiContext`                                                          | themes, selected theme, panels, sidebar, and UI state                                                     |
| `narrowViewportContext`                                              | narrow-layout boolean                                                                                     |

Lazy contexts subscribe on first consumer and tear down after the last consumer: `labelsContext`, `fullEntitiesContext`, `configEntriesContext`, `manifestsContext`, `triggerDescriptionsContext`, and `conditionDescriptionsContext`.

The single-field contexts such as `localizeContext`, `themesContext`, and `userContext` are deprecated. Use grouped contexts instead.

## Consumption Patterns

Import `consume` from `src/common/decorators/consume`, not from `@lit/context`. The `@lit/context` version forces a host update on every context change, so every consumed field rerenders the component, even without `@state()`, and `@transform` cannot skip anything. Our `consume` leaves update scheduling to the field:

- `@state()` plus `@consume`: rerenders when the context value changes.
- `@state()` plus `@consume` plus `@transform`: rerenders only when the transformed value changes.
- `@consume` alone: the field stays current but never triggers a render. Use this for values only read in event handlers or callbacks, such as `apiContext`, or for data read on demand, such as picker item callbacks.

In controllers or for lazily created subscriptions, use `ContextSubscriptionController` from the same file instead of `@lit/context`'s `ContextConsumer`, which also forces a host update. Its callback must store the value in a reactive field or call `host.requestUpdate()` itself when the host needs to rerender.

Use entity-scoped helpers when the component watches an entity ID held on the host:

```ts
@state() @consumeEntityState({ entityIdPath: ["_config", "entity"] })
private _stateObj?: HassEntity;

@state() @consumeEntityRegistryEntry({ entityIdPath: ["_config", "entity"] })
private _entity?: EntityRegistryDisplayEntry;

@state() @consumeLocalize()
private _localize!: LocalizeFunc;
```

Use `consumeEntityStates` when the host property contains one or more entity IDs. It filters missing entities and preserves the previous record when none of the selected entities changed.

```ts
@state() @consumeEntityStates({ entityIdPath: ["_config", "entities"] })
private _stateObjs?: Record<string, HassEntity>;
```

For a single field from a grouped context, pair `@consume` with `@transform`:

```ts
@state()
@consume({ context: uiContext, subscribe: true })
@transform<HomeAssistantUI, Themes>({ transformer: ({ themes }) => themes })
private _themes!: Themes;
```

Use `@transform` with `watch` when the transformer depends on a host property, such as a computed entity ID. `consumeEntityState` and `consumeEntityStates` only watch the first path segment.

To consume a whole group untransformed, omit `@transform` and type the field as `ContextType<typeof statesContext>` or the matching context type.

## Review Checklist

- The component consumes the narrowest context needed for the data it reads.
- A broad `hass` property is kept only when the component is a container or external API requires it.
- Entity-scoped reads use the consume helpers rather than ad hoc context transforms.
- Context fields read during render or `willUpdate` are marked `@state()` so updates trigger rendering. Fields only read outside the render cycle are left without `@state()`.
- Tests and mocks only provide the data the component actually consumes.
