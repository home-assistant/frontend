import {
  LitElement,
  property,
  internalProperty,
  TemplateResult,
  html,
  customElement,
} from "lit-element";
import { mdiArrowLeft, mdiArrowRight } from "@mdi/js";
import "@material/mwc-icon-button/mwc-icon-button";
import "./ha-svg-icon";

@customElement("ha-icon-button-arrow-prev")
export class HaIconButtonArrowPrev extends LitElement {
  @property({ type: Boolean }) public disabled = false;

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
    return html`<mwc-icon-button .disabled=${this.disabled}>
      <ha-svg-icon .path=${this._icon}></ha-svg-icon>
    </mwc-icon-button> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-button-arrow-prev": HaIconButtonArrowPrev;
  }
}
