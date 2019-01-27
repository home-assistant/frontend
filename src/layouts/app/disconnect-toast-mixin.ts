import { Constructor, LitElement } from "lit-element";
import { HassBaseEl } from "./hass-base-mixin";
import { hassLocalizeLitMixin } from "../../mixins/lit-localize-mixin";
import { HaToast } from "../../components/ha-toast";

export default (superClass: Constructor<LitElement & HassBaseEl>) =>
  class extends hassLocalizeLitMixin(superClass) {
    private _discToast?: HaToast;

    protected hassConnected() {
      super.hassConnected();
      // Need to load in advance because when disconnected, can't dynamically load code.
      import(/* webpackChunkName: "ha-toast" */ "../../components/ha-toast");
    }

    protected hassReconnected() {
      super.hassReconnected();
      if (this._discToast) {
        this._discToast.opened = false;
      }
    }

    protected hassDisconnected() {
      super.hassDisconnected();
      if (!this._discToast) {
        const el = document.createElement("ha-toast");
        el.duration = 0;
        el.text = this.hass!.localize("ui.notification_toast.connection_lost");
        this._discToast = el;
        this.shadowRoot!.appendChild(el as any);
      }
      this._discToast.opened = true;
    }
  };
