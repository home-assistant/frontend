import type { ReactiveElement } from "lit";
import type { Constructor } from "../types";

export const WakeLockMixin = <T extends Constructor<ReactiveElement>>(
  superClass: T
) =>
  class WakeLockClass extends superClass {
    private _wakeLock?: Promise<WakeLockSentinel>;

    public connectedCallback() {
      super.connectedCallback();
      if ("wakeLock" in navigator) {
        this._wakeLock = navigator.wakeLock.request();
      }
    }

    public disconnectedCallback() {
      super.disconnectedCallback();
      this._wakeLock?.then((wakeLock) => wakeLock.release());
    }
  };
