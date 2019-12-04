import { directive, Part, NodePart } from "lit-html";

export const dynamicContentDirective = directive(
  (tag: string, properties?: { [key: string]: any }) => (part: Part): void => {
    if (!(part instanceof NodePart)) {
      throw new Error(
        "dynamicContentDirective can only be used in content bindings"
      );
    }

    let element = part.value as HTMLElement | undefined;

    if (
      element !== undefined &&
      tag.toUpperCase() === (element as HTMLElement).tagName
    ) {
      if (properties) {
        Object.entries(properties).forEach(([key, value]) => {
          element![key] = value;
        });
      }
      return;
    }

    element = document.createElement(tag);
    if (properties) {
      Object.entries(properties).forEach(([key, value]) => {
        element![key] = value;
      });
    }
    part.setValue(element);
  }
);
