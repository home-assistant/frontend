import {
  LitElement,
  query,
  property,
  TemplateResult,
  html,
  css,
  CSSResult,
} from "lit-element";
import { computeRTL } from "../common/util/compute_rtl";
import { HomeAssistant } from "../types";
import "@material/mwc-button";
import "../components/ha-toast";
// Typing
// tslint:disable-next-line: no-duplicate-imports
import { HaToast } from "../components/ha-toast";

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
  @property() public hass!: HomeAssistant;

  @property() private _action?: ToastActionParams;
  @property() private _noCancelOnOutsideClick: boolean = false;

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

  static get styles(): CSSResult {
    return css`
      mwc-button {
        color: var(--primary-color);
        font-weight: bold;
      }
    `;
  }
}

customElements.define("notification-manager", NotificationManager);

declare global {
  // for fire event
  interface HASSDomEvents {
    "hass-notification": ShowToastParams;
  }
}
