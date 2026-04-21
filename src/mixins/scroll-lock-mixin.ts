import type { ReactiveElement } from "lit";
import type { Constructor } from "../types";

let bodyScrollLockCount = 0;

let previousBodyOverflow = "";

export const ScrollLockMixin = <T extends Constructor<ReactiveElement>>(
  superClass: T
) => {
  class ScrollLockClass extends superClass {
    private _bodyScrollLocked = false;

    protected lockBodyScroll() {
      if (this._bodyScrollLocked) {
        return;
      }

      this._bodyScrollLocked = true;

      if (bodyScrollLockCount === 0) {
        previousBodyOverflow = document.body.style.overflow;
      }

      bodyScrollLockCount += 1;
      document.body.style.overflow = "hidden";
    }

    protected unlockBodyScroll() {
      if (!this._bodyScrollLocked) {
        return;
      }

      this._bodyScrollLocked = false;
      bodyScrollLockCount -= 1;

      if (bodyScrollLockCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
      }
    }

    public disconnectedCallback(): void {
      this.unlockBodyScroll();
      super.disconnectedCallback();
    }
  }

  return ScrollLockClass;
};
