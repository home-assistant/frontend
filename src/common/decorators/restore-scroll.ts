import type { ReactiveElement } from "lit";
import { throttle } from "../util/throttle";

const throttleReplaceState = throttle((value) => {
  history.replaceState({ scrollPosition: value }, "");
}, 300);

export function restoreScroll(selector: string) {
  return <ElemClass extends ReactiveElement>(
    proto: ElemClass,
    propertyKey: string
  ) => {
    if (typeof propertyKey === "object") {
      throw new Error("This decorator does not support this compilation type.");
    }

    const connectedCallback = proto.connectedCallback;
    proto.connectedCallback = function () {
      connectedCallback.call(this);

      const scrollPos = this[propertyKey];

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

    const descriptor = Object.getOwnPropertyDescriptor(proto, propertyKey);
    let newDescriptor: PropertyDescriptor;
    if (descriptor === undefined) {
      newDescriptor = {
        get(this: ReactiveElement) {
          return (
            this[`__${String(propertyKey)}`] || history.state?.scrollPosition
          );
        },
        set(this: ReactiveElement, value) {
          throttleReplaceState(value);
          this[`__${String(propertyKey)}`] = value;
        },
        configurable: true,
        enumerable: true,
      };
    } else {
      const oldSetter = descriptor.set;
      newDescriptor = {
        ...descriptor,
        set(this: ReactiveElement, value) {
          throttleReplaceState(value);
          this[`__${String(propertyKey)}`] = value;
          oldSetter?.call(this, value);
        },
      };
    }
    Object.defineProperty(proto, propertyKey, newDescriptor);
  };
}
