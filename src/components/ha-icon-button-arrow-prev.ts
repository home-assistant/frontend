import "@material/mwc-icon-button/mwc-icon-button";
import { mdiArrowLeft, mdiArrowRight } from "@mdi/js";
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { HomeAssistant } from "../types";
import "./ha-svg-icon";

@customElement("ha-icon-button-arrow-prev")
export class HaIconButtonArrowPrev extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property() public label?: string;

  @internalProperty() private _icon = mdiArrowLeft;

  public connectedCallback() {
    super.connectedCallback();

    // wait to check for direction since otherwise direction is wrong even though top level is RTL
    setTimeout(() => {
      this._icon =
        window.getComputedStyle(this).direction === "ltr"
          ? mdiArrowLeft
          : mdiArrowRight;
    }, 100);
  }

  protected render(): TemplateResult {
    return html`
      <mwc-icon-button
        .disabled=${this.disabled}
        .label=${this.label || this.hass?.localize("ui.common.back") || "Back"}
      >
        <ha-svg-icon .path=${this._icon}></ha-svg-icon>
      </mwc-icon-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-button-arrow-prev": HaIconButtonArrowPrev;
  }
}
