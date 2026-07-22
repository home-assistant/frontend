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
    | { translationKey: LocalizeKeys; args?: Record<string, string | number> };
  announceMessage?:
    | string
    | { translationKey: LocalizeKeys; args?: Record<string, string | number> };
  action?: ToastActionParams;
  secondaryAction?: ToastActionParams;
  dismiss?: () => void;
  duration?: number;
  dismissable?: boolean;
  bottomOffset?: number;
}

export interface ToastActionParams {
  action: () => void;
  primary?: boolean;
  text:
    | string
    | { translationKey: LocalizeKeys; args?: Record<string, string | number> };
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

  private _toastClosed(ev: HASSDomEvent<ToastClosedEventDetail>) {
    if (ev.detail.reason === "dismiss") {
      this._parameters?.dismiss?.();
    }
    this._parameters = undefined;
  }

  protected render() {
    if (!this._parameters) {
      return nothing;
    }
    return html`
      <ha-toast
        .labelText=${
          typeof this._parameters.message !== "string"
            ? this.hass.localize(
                this._parameters.message.translationKey,
                this._parameters.message.args
              )
            : this._parameters.message
        }
        .announceText=${
          this._parameters.announceMessage
            ? typeof this._parameters.announceMessage !== "string"
              ? this.hass.localize(
                  this._parameters.announceMessage.translationKey,
                  this._parameters.announceMessage.args
                )
              : this._parameters.announceMessage
            : undefined
        }
        .timeoutMs=${this._parameters.duration!}
        .bottomOffset=${this._parameters.bottomOffset ?? 0}
        @toast-closed=${this._toastClosed}
      >
        ${this._renderAction(this._parameters.secondaryAction, true)}
        ${this._renderAction(this._parameters.action, false)}
        ${
          this._parameters?.dismissable
            ? html`
                <ha-icon-button
                  .label=${this.hass.localize("ui.common.close")}
                  .path=${mdiClose}
                  slot="dismiss"
                  @click=${this._dismissClicked}
                ></ha-icon-button>
              `
            : nothing
        }
      </ha-toast>
    `;
  }

  private _renderAction(
    action: ToastActionParams | undefined,
    secondary: boolean
  ) {
    if (!action) {
      return nothing;
    }
    return html`
      <ha-button
        appearance=${action.primary ? "filled" : "plain"}
        size="s"
        slot="action"
        @click=${secondary ? this._secondaryButtonClicked : this._buttonClicked}
      >
        ${
          typeof action.text !== "string"
            ? this.hass.localize(action.text.translationKey, action.text.args)
            : action.text
        }
      </ha-button>
    `;
  }

  private _buttonClicked() {
    this._toast?.hide("action");
    this._parameters?.action?.action();
  }

  private _secondaryButtonClicked() {
    this._toast?.hide("action");
    this._parameters?.secondaryAction?.action();
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
