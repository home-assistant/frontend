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
        history.replaceState({ scrollPosition: value }, "");
        this[`__${String(element.key)}`] = value;
      },
      get(this: LitElement) {
        return (
          this[`__${String(element.key)}`] || history.state?.scrollPosition
        );
      },
      enumerable: true,
      configurable: true,
    },
    finisher(cls: typeof LitElement) {
      const connectedCallback = cls.prototype.connectedCallback;
      cls.prototype.connectedCallback = function () {
        connectedCallback.call(this);
        const scrollPos = this[element.key];
        if (scrollPos) {
          this.updateComplete.then(() => {
            const target = this.renderRoot.querySelector(selector);
            if (!target) {
              return;
            }
            setTimeout(() => {
              target.scrollTop = scrollPos;
            }, 0);
          });
        }
      };
    },
  });
