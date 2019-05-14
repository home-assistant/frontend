import { computeRTL } from "../common/util/compute_rtl";
import "../components/ha-toast";
import { LitElement, query, property, TemplateResult, html } from "lit-element";
import { HomeAssistant } from "../types";
// Typing
// tslint:disable-next-line: no-duplicate-imports
import { HaToast } from "../components/ha-toast";

export interface ShowToastParams {
  message: string;
}

class NotificationManager extends LitElement {
  @property() public hass!: HomeAssistant;
  @query("ha-toast") private _toast!: HaToast;

  public showDialog({ message }: ShowToastParams) {
    const toast = this._toast;
    toast.setAttribute("dir", computeRTL(this.hass) ? "rtl" : "ltr");
    toast.show(message);
  }

  protected render(): TemplateResult | void {
    return html`
      <ha-toast dir="[[_rtl]]" noCancelOnOutsideClick=${false}></ha-toast>
    `;
  }
}

customElements.define("notification-manager", NotificationManager);
