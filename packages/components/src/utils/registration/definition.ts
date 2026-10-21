import type { LitElement } from "lit";

/**
 * An element to register: its tag name and its class. The `scoped` entry
 * point of an element exports one, e.g. `hacCard`.
 */
export interface ElementDefinition<
  E extends CustomElementConstructor = CustomElementConstructor,
> {
  readonly tagName: string;
  readonly element: E;
}

/**
 * A hac component class. Components list the elements they render in their
 * shadow root in `dependencies`, without registering them. The entry point a
 * component is loaded through decides where those are registered:
 *
 * - global: in the global registry, like the component itself
 * - scoped: in a scoped registry of the component's shadow root, so its
 *   internals always use the bundled, same-version dependencies
 */
export type ComponentClass = (new () => LitElement) & {
  readonly dependencies?: readonly ElementDefinition<ComponentClass>[];
};
