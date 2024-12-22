import { html, LitElement, nothing } from "lit";
import { property, state, query } from "lit/decorators";
import { mdiClose } from "@mdi/js";
import { computeRTL } from "../common/util/compute_rtl";
import "../components/ha-toast";
import type { HaToast } from "../components/ha-toast";
import type { HomeAssistant } from "../types";
import "../components/ha-button";

export interface ShowToastParams {
  message: string;
  action?: ToastActionParams;
  duration?: number;
  dismissable?: boolean;
}

export interface ToastActionParams {
  action: () => void;
  text: string;
}

class NotificationManager extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _parameters?: ShowToastParams;

  @query("ha-toast") private _toast!: HaToast | undefined;

  public async showDialog(parameters: ShowToastParams) {
    if (this._parameters && this._parameters.message !== parameters.message) {
      this._parameters = undefined;
      await this.updateComplete;
    }

    if (!parameters || parameters.duration === 0) {
      return;
    }

    this._parameters = parameters;

    if (
      this._parameters.duration === undefined ||
      (this._parameters.duration > 0 && this._parameters.duration <= 4000)
    ) {
      this._parameters.duration = 4000;
    }
  }

  public shouldUpdate(changedProperties) {
    return !this._toast || changedProperties.has("_parameters");
  }

  private _toastClosed() {
    this._parameters = undefined;
  }

  protected render() {
    if (!this._parameters) {
      return nothing;
    }
    return html`
      <ha-toast
        leading
        open
        dir=${computeRTL(this.hass) ? "rtl" : "ltr"}
        .labelText=${this._parameters.message}
        .timeoutMs=${this._parameters.duration!}
        @MDCSnackbar:closed=${this._toastClosed}
      >
        ${this._parameters?.action
          ? html`
              <ha-button
                slot="action"
                .label=${this._parameters?.action.text}
                @click=${this.buttonClicked}
              ></ha-button>
            `
          : nothing}
        ${this._parameters?.dismissable
          ? html`<ha-icon-button
              .label=${this.hass.localize("ui.common.close")}
              .path=${mdiClose}
              dialogAction="close"
              slot="dismiss"
            ></ha-icon-button>`
          : nothing}
      </ha-toast>
    `;
  }

  private buttonClicked() {
    this._toast?.close("action");
    if (this._parameters?.action) {
      this._parameters?.action.action();
    }
  }
}

customElements.define("notification-manager", NotificationManager);

declare global {
  interface HTMLElementTagNameMap {
    "notification-manager": NotificationManager;
  }

  // for fire event
  interface HASSDomEvents {
    "hass-notification": ShowToastParams;
  }
}
