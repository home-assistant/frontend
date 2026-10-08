import type { LitElement } from "lit";
import { state } from "lit/decorators";
import { listenMediaQuery } from "../common/dom/media_query";
import type { Constructor } from "../types";

export const ReducedMotionMixin = <T extends Constructor<LitElement>>(
  superClass: T
) => {
  class ReducedMotionClass extends superClass {
    @state() protected _reducedMotion = false;

    private _unsubReducedMotionMql?: () => void;

    public connectedCallback() {
      super.connectedCallback();
      this._unsubReducedMotionMql = listenMediaQuery(
        "(prefers-reduced-motion: reduce)",
        (matches) => {
          this._reducedMotion = matches;
        }
      );
    }

    public disconnectedCallback() {
      super.disconnectedCallback();
      this._unsubReducedMotionMql?.();
      this._unsubReducedMotionMql = undefined;
    }
  }
  return ReducedMotionClass;
};
