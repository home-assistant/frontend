import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { property, state, query } from "lit/decorators";
import { computeRTL } from "../common/util/compute_rtl";
import "../components/ha-toast";
import type { HaToast } from "../components/ha-toast";
import type { HomeAssistant } from "../types";

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

  @state() private _action?: ToastActionParams;

  @state() private _noCancelOnOutsideClick = false;

  @query("ha-toast") private _toast!: HaToast;

  public async showDialog({
    message,
    action,
    duration,
    dismissable,
  }: ShowToastParams) {
    let toast = this._toast;
    // Can happen on initial load
    if (!toast) {
      await this.updateComplete;
      toast = this._toast;
    }
    toast.setAttribute("dir", computeRTL(this.hass) ? "rtl" : "ltr");
    this._action = action || undefined;
    this._noCancelOnOutsideClick =
      dismissable === undefined ? false : !dismissable;
    toast.hide();
    toast.show({
      text: message,
      duration: duration === undefined ? 3000 : duration,
    });
  }

  protected render(): TemplateResult {
    return html`
      <ha-toast .noCancelOnOutsideClick=${this._noCancelOnOutsideClick}>
        ${this._action
          ? html`
              <mwc-button
                .label=${this._action.text}
                @click=${this.buttonClicked}
              ></mwc-button>
            `
          : ""}
      </ha-toast>
    `;
  }

  private buttonClicked() {
    this._toast.hide();
    if (this._action) {
      this._action.action();
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-toast {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
      }
      mwc-button {
        color: var(--primary-color);
        font-weight: bold;
        margin-left: 8px;
      }
    `;
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
