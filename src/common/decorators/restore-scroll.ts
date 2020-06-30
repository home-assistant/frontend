import { LitElement } from "lit-element";
import { Constructor } from "../../types";

interface ClassElement {
  kind: "field" | "method";
  key: PropertyKey;
  placement: "static" | "prototype" | "own";
  initializer?: Function;
  extras?: ClassElement[];
  finisher?: <T>(cls: Constructor<T>) => undefined | Constructor<T>;
  descriptor?: PropertyDescriptor;
}

export function restoreScroll(selector: string): any {
  return (element: ClassElement) => ({
    kind: "method",
    placement: "prototype",
    key: element.key,
    descriptor: {
      set(this: LitElement, value: number) {
        this[`__${String(element.key)}`] = value;
      },
      get(this: LitElement) {
        return this[`__${String(element.key)}`];
      },
      enumerable: true,
      configurable: true,
    },
    finisher(cls: typeof LitElement) {
      const connectedCallback = cls.prototype.connectedCallback;
      cls.prototype.connectedCallback = function () {
        connectedCallback.call(this);
        if (this[element.key]) {
          const target = this.renderRoot.querySelector(selector);
          if (!target) {
            return;
          }
          target.scrollTop = this[element.key];
        }
      };
    },
  });
}
