import { ScopedElementsMixin } from "../../scoped";
import { define } from "./define";
import type { ComponentClass } from "./definition";

/** Registers a component and its dependencies in the global registry. */
export const defineGlobal = (
  tagName: string,
  elementClass: ComponentClass
): void => {
  for (const dependency of elementClass.dependencies ?? []) {
    defineGlobal(dependency.tagName, dependency.element);
  }
  define(tagName, elementClass);
};

const variants = new WeakMap<ComponentClass, ComponentClass>();

/**
 * The class to register in a scoped registry: the component itself if it has
 * no dependencies, otherwise a subclass whose shadow root has its own
 * registry with scoped variants of its dependencies. Created once per class.
 */
export const scopedVariant = <T extends ComponentClass>(elementClass: T): T => {
  const dependencies = elementClass.dependencies ?? [];
  if (dependencies.length === 0) {
    return elementClass;
  }
  let variant = variants.get(elementClass);
  if (!variant) {
    // The mixin returns a new subclass, the variant
    variant = ScopedElementsMixin(
      elementClass,
      dependencies.map(({ tagName, element }) => ({
        tagName,
        element: scopedVariant(element),
      }))
    );
    variants.set(elementClass, variant);
  }
  return variant as T;
};
