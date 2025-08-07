import type { LitElement } from "lit";
import { state } from "lit/decorators";
import type { Constructor } from "../types";
import { isMobileClient } from "../util/is_mobile";
import { listenMediaQuery } from "../common/dom/media_query";

export const MobileAwareMixin = <T extends Constructor<LitElement>>(
  superClass: T
) => {
  class MobileAwareClass extends superClass {
    @state() protected _isMobileSize = false;

    protected _isMobileClient = isMobileClient;

    private _unsubMql?: () => void;

    public connectedCallback() {
      super.connectedCallback();
      this._unsubMql = listenMediaQuery(
        "all and (max-width: 450px), all and (max-height: 500px)",
        (matches) => {
          this._isMobileSize = matches;
        }
      );
    }

    public disconnectedCallback() {
      super.disconnectedCallback();
      this._unsubMql?.();
      this._unsubMql = undefined;
    }
  }
  return MobileAwareClass;
};
