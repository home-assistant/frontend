import type { LitElement } from "lit";

/** Resolves the class to register for a tag name, possibly asynchronously. */
export interface ElementLoader {
  load(): Promise<CustomElementConstructor>;
}

/**
 * An element to register: its tag name and its class, or a loader for it
 * from a `dynamic` entry point. The `scoped` and `dynamic` entry point of an
 * element export one, e.g. `hacCard`.
 */
export interface ElementDefinition<
  E extends CustomElementConstructor | ElementLoader =
    CustomElementConstructor | ElementLoader,
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
 * - scoped and dynamic: in a scoped registry of the component's shadow root,
 *   so its internals always use the bundled, same-version dependencies
 */
export type ComponentClass = (new () => LitElement) & {
  readonly dependencies?: readonly ElementDefinition<ComponentClass>[];
};
