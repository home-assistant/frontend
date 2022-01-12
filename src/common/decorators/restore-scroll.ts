import type { LitElement } from "lit";
import type { ClassElement } from "../../types";

export const restoreScroll =
  (selector: string): any =>
  (element: ClassElement) => ({
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
