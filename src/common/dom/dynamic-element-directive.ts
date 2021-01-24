import { directive, NodePart, Part } from "lit-html";

export const dynamicElement = directive(
  (tag: string, properties?: Record<string, any>) => (part: Part): void => {
    if (!(part instanceof NodePart)) {
      throw new Error(
        "dynamicElementDirective can only be used in content bindings"
      );
    }

    let element = part.value as HTMLElement | undefined;

    if (tag === element?.localName) {
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
