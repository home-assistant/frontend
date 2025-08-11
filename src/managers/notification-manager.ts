import { mdiClose } from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { property, query, state } from "lit/decorators";
import type { LocalizeKeys } from "../common/translations/localize";
import "../components/ha-button";
import "../components/ha-icon-button";
import "../components/ha-toast";
import type { HaToast } from "../components/ha-toast";
import type { HomeAssistant } from "../types";

export interface ShowToastParams {
  // Unique ID for the toast. If a new toast is shown with the same ID as the previous toast, it will be replaced to avoid flickering.
  id?: string;
  message:
    | string
    | { translationKey: LocalizeKeys; args?: Record<string, unknown> };
  action?: ToastActionParams;
  duration?: number;
  dismissable?: boolean;
}

export interface ToastActionParams {
  action: () => void;
  text:
    | string
    | { translationKey: LocalizeKeys; args?: Record<string, unknown> };
}

class NotificationManager extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _parameters?: ShowToastParams;

  @query("ha-toast") private _toast!: HaToast | undefined;

  public async showDialog(parameters: ShowToastParams) {
    if (!parameters.id || this._parameters?.id !== parameters.id) {
      this._toast?.close();
    }

    if (!parameters || parameters.duration === 0) {
      this._parameters = undefined;
      return;
    }

    this._parameters = parameters;

    if (
      this._parameters.duration === undefined ||
      (this._parameters.duration > 0 && this._parameters.duration <= 4000)
    ) {
      this._parameters.duration = 4000;
    }

    await this.updateComplete;
    this._toast?.show();
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
        .labelText=${typeof this._parameters.message !== "string"
          ? this.hass.localize(this._parameters.message.translationKey, this._parameters.message.args)
          : this._parameters.message}
        .timeoutMs=${this._parameters.duration!}
        @MDCSnackbar:closed=${this._toastClosed}
      >
        ${this._parameters?.action
          ? html`
              <ha-button
                appearance="plain"
                size="small"
                slot="action"
                @click=${this._buttonClicked}
              >
                ${typeof this._parameters?.action.text !== "string"
                  ? this.hass.localize(
                      this._parameters?.action.text.translationKey
                    )
                  : this._parameters?.action.text}
              </ha-button>
            `
          : nothing}
        ${this._parameters?.dismissable
          ? html`
              <ha-icon-button
                .label=${this.hass.localize("ui.common.close")}
                .path=${mdiClose}
                dialogAction="close"
                slot="dismiss"
              ></ha-icon-button>
            `
          : nothing}
      </ha-toast>
    `;
  }

  private _buttonClicked() {
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
