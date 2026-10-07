/**
 * Registers a custom element unless the tag name is already taken.
 *
 * The custom element registry is global to the page. Home Assistant and custom
 * cards can each ship a copy of this library, so registering the same tag name
 * twice must not throw. The first registration wins.
 */
export const define = (
  tagName: string,
  elementClass: CustomElementConstructor
): void => {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, elementClass);
  }
};
