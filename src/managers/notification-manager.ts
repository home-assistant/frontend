import { mdiClose } from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import type { HASSDomEvent } from "../common/dom/fire_event";
import type { LocalizeKeys } from "../common/translations/localize";
import "../components/ha-button";
import "../components/ha-icon-button";
import "../components/ha-toast";
import type { ToastClosedEventDetail } from "../components/ha-toast";
import type { HomeAssistant } from "../types";

export interface ShowToastParams {
  // Unique ID for the toast. If a new toast is shown with the same ID as the previous toast, it will be replaced to avoid flickering.
  id?: string;
  message:
    | string
    | { translationKey: LocalizeKeys; args?: Record<string, string> };
  action?: ToastActionParams;
  duration?: number;
  dismissable?: boolean;
  bottomOffset?: number;
}

export interface ToastActionParams {
  action: () => void;
  text:
    | string
    | { translationKey: LocalizeKeys; args?: Record<string, string> };
}

@customElement("notification-manager")
class NotificationManager extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _parameters?: ShowToastParams;

  @query("ha-toast")
  private _toast!: HTMLElementTagNameMap["ha-toast"] | undefined;

  private _showDialogId = 0;

  public async showDialog(parameters: ShowToastParams) {
    const showId = ++this._showDialogId;

    if (!parameters.id || this._parameters?.id !== parameters.id) {
      await this._toast?.hide();
    }

    if (showId !== this._showDialogId) {
      return;
    }

    if (parameters.duration === 0) {
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

    if (showId !== this._showDialogId) {
      return;
    }

    this._toast?.show();
  }

  private _toastClosed(_ev: HASSDomEvent<ToastClosedEventDetail>) {
    this._parameters = undefined;
  }

  protected render() {
    if (!this._parameters) {
      return nothing;
    }
    return html`
      <ha-toast
        .labelText=${typeof this._parameters.message !== "string"
          ? this.hass.localize(
              this._parameters.message.translationKey,
              this._parameters.message.args
            )
          : this._parameters.message}
        .timeoutMs=${this._parameters.duration!}
        .bottomOffset=${this._parameters.bottomOffset ?? 0}
        @toast-closed=${this._toastClosed}
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
                      this._parameters?.action.text.translationKey,
                      this._parameters?.action.text.args
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
                slot="dismiss"
                @click=${this._dismissClicked}
              ></ha-icon-button>
            `
          : nothing}
      </ha-toast>
    `;
  }

  private _buttonClicked() {
    this._toast?.hide("action");
    if (this._parameters?.action) {
      this._parameters?.action.action();
    }
  }

  private _dismissClicked() {
    this._toast?.hide("dismiss");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "notification-manager": NotificationManager;
  }

  // for fire event
  interface HASSDomEvents {
    "hass-notification": ShowToastParams;
  }
}
