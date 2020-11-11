import {
  LitElement,
  property,
  internalProperty,
  TemplateResult,
  html,
  customElement,
} from "lit-element";
import { mdiChevronRight, mdiChevronLeft } from "@mdi/js";
import "@material/mwc-icon-button";
import "./ha-svg-icon";
import { HomeAssistant } from "../types";

@customElement("ha-icon-button-next")
export class HaIconButtonNext extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property() public label?: string;

  @internalProperty() private _icon = mdiChevronRight;

  public connectedCallback() {
    super.connectedCallback();

    // wait to check for direction since otherwise direction is wrong even though top level is RTL
    setTimeout(() => {
      this._icon =
        window.getComputedStyle(this).direction === "ltr"
          ? mdiChevronRight
          : mdiChevronLeft;
    }, 100);
  }

  protected render(): TemplateResult {
    return html`
      <mwc-icon-button
        .disabled=${this.disabled}
        .label=${this.label || this.hass?.localize("ui.common.next") || "Next"}
      >
        <ha-svg-icon .path=${this._icon}></ha-svg-icon>
      </mwc-icon-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-button-next": HaIconButtonNext;
  }
}
