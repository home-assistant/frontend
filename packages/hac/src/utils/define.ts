/**
 * Registers a custom element unless the tag name is already taken in the
 * registry.
 *
 * Home Assistant and custom cards can each ship a copy of this library, so
 * registering the same tag name twice must not throw. The first registration
 * wins.
 */
export const define = (
  tagName: string,
  elementClass: CustomElementConstructor,
  registry: CustomElementRegistry = customElements
): void => {
  if (!registry.get(tagName)) {
    registry.define(tagName, elementClass);
  }
};
