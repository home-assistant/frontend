import { Constructor } from "lit-element";
import "@polymer/paper-icon-button/paper-icon-button";
// Not duplicate, this is for typing.
// tslint:disable-next-line
import { PaperIconButtonElement } from "@polymer/paper-icon-button/paper-icon-button";

const paperIconButtonClass = customElements.get(
  "paper-icon-button"
) as Constructor<PaperIconButtonElement>;

export class HaPaperIconButtonArrowNext extends paperIconButtonClass {
  public connectedCallback() {
    this.icon =
      window.getComputedStyle(this).direction === "ltr"
        ? "hass:arrow-right"
        : "hass:arrow-left";

    // calling super after setting icon to have it consistently show the icon (otherwise not always shown)
    super.connectedCallback();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-paper-icon-button-arrow-next": HaPaperIconButtonArrowNext;
  }
}

customElements.define(
  "ha-paper-icon-button-arrow-next",
  HaPaperIconButtonArrowNext
);
