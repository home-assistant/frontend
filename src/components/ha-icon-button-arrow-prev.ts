import { LitElement, property, TemplateResult, html } from "lit-element";
import { mdiArrowLeft, mdiArrowRight } from "@mdi/js";
import "@material/mwc-icon-button/mwc-icon-button";
import "./ha-svg-icon";

export class HaIconButtonArrowPrev extends LitElement {
  @property() private _icon = mdiArrowLeft;

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
    return html`<mwc-icon-button>
      <ha-svg-icon .path=${this._icon}></ha-svg-icon>
    </mwc-icon-button> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-button-arrow-prev": HaIconButtonArrowPrev;
  }
}

customElements.define("ha-icon-button-arrow-prev", HaIconButtonArrowPrev);
