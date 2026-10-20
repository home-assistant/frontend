import type { LitElement } from "lit";
import { ScopedElementsMixin } from "../../scoped";
import { define } from "./define";
import type { HacElementDefinition } from "./definition";

/**
 * A hac component class. Components list the elements they render in their
 * shadow root in `dependencies`, without registering them. The
 * entry point a component is loaded through decides where those are
 * registered:
 *
 * - global: in the global registry, like the component itself
 * - scoped and dynamic: in a scoped registry of the component's shadow root,
 *   so its internals always use the bundled, same-version dependencies
 */
export type HacElementClass = (new () => LitElement) & {
  readonly dependencies?: readonly HacElementDefinition<HacElementClass>[];
};

/** Registers a component and its dependencies in the global registry. */
export const defineGlobal = (
  tagName: string,
  elementClass: HacElementClass
): void => {
  for (const dependency of elementClass.dependencies ?? []) {
    defineGlobal(dependency.tagName, dependency.element);
  }
  define(tagName, elementClass);
};

const variants = new WeakMap<HacElementClass, HacElementClass>();

/**
 * The class to register in a scoped registry: the component itself if it has
 * no dependencies, otherwise a subclass whose shadow root has its own
 * registry with scoped variants of its dependencies. Created once per class.
 */
export const scopedVariant = <T extends HacElementClass>(
  elementClass: T
): T => {
  const dependencies = elementClass.dependencies ?? [];
  if (dependencies.length === 0) {
    return elementClass;
  }
  let variant = variants.get(elementClass);
  if (!variant) {
    variant = class extends (
      ScopedElementsMixin(
        elementClass,
        dependencies.map(({ tagName, element }) => ({
          tagName,
          element: scopedVariant(element),
        }))
      )
    ) {};
    variants.set(elementClass, variant);
  }
  return variant as T;
};
