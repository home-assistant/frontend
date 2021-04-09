import {
  Directive,
  directive,
  DirectiveParameters,
  ElementPart,
  PartInfo,
  PartType,
} from "lit-html/directive.js";

export const dynamicElement = directive(
  class extends Directive {
    constructor(partInfo: PartInfo) {
      super(partInfo);
      if (partInfo.type !== PartType.ELEMENT) {
        throw new Error(
          "dynamicElementDirective can only be used in content bindings"
        );
      }
    }

    update(part: ElementPart, [tag, properties]: DirectiveParameters<this>) {
      const element = part.element as HTMLElement | undefined;
      if (tag === element?.localName) {
        if (properties) {
          Object.entries(properties).forEach(([key, value]) => {
            element![key] = value;
          });
        }
        return;
      }
      this.render(tag, properties);
    }

    render(tag: string, properties?: Record<string, any>): HTMLElement {
      const element = document.createElement(tag);
      if (properties) {
        Object.entries(properties).forEach(([key, value]) => {
          element![key] = value;
        });
      }
      return element;
    }
  }
);
