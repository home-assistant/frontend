import type { ReactiveElement } from "lit";
import type { Constructor } from "../types";

export const ScrollLockMixin = <T extends Constructor<ReactiveElement>>(
  superClass: T
) => {
  class ScrollLockClass extends superClass {
    private static _bodyScrollLockCount = 0;

    private static _previousBodyOverflow = "";

    private static _previousScrollbarGutter = "";

    private static _reserveScrollbarGutter = false;

    private _bodyScrollLocked = false;

    public disconnectedCallback(): void {
      this.unlockBodyScroll();
      super.disconnectedCallback();
    }

    protected lockBodyScroll() {
      if (this._bodyScrollLocked) {
        return;
      }

      this._bodyScrollLocked = true;

      if (ScrollLockClass._bodyScrollLockCount === 0) {
        ScrollLockClass._previousBodyOverflow = document.body.style.overflow;
        ScrollLockClass._previousScrollbarGutter =
          document.documentElement.style.getPropertyValue("scrollbar-gutter");
        ScrollLockClass._reserveScrollbarGutter =
          window.innerWidth > document.documentElement.clientWidth;
      }

      ScrollLockClass._bodyScrollLockCount += 1;
      document.body.style.overflow = "hidden";

      if (ScrollLockClass._reserveScrollbarGutter) {
        document.documentElement.style.setProperty(
          "scrollbar-gutter",
          "stable"
        );
      }
    }

    protected unlockBodyScroll() {
      if (!this._bodyScrollLocked) {
        return;
      }

      this._bodyScrollLocked = false;
      ScrollLockClass._bodyScrollLockCount -= 1;

      if (ScrollLockClass._bodyScrollLockCount === 0) {
        document.body.style.overflow = ScrollLockClass._previousBodyOverflow;

        if (ScrollLockClass._previousScrollbarGutter) {
          document.documentElement.style.setProperty(
            "scrollbar-gutter",
            ScrollLockClass._previousScrollbarGutter
          );
        } else {
          document.documentElement.style.removeProperty("scrollbar-gutter");
        }

        ScrollLockClass._reserveScrollbarGutter = false;
      }
    }
  }

  return ScrollLockClass;
};
