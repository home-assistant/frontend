import "@polymer/paper-icon-button/paper-icon-button";
import { Constructor } from "../types";
// Not duplicate, this is for typing.
// tslint:disable-next-line
import { PaperIconButtonElement } from "@polymer/paper-icon-button/paper-icon-button";

const paperIconButtonClass = customElements.get(
  "paper-icon-button"
) as Constructor<PaperIconButtonElement>;

export class HaPaperIconButtonArrowNext extends paperIconButtonClass {
  public connectedCallback() {
    super.connectedCallback();

    // wait to check for direction since otherwise direction is wrong even though top level is RTL
    setTimeout(() => {
      this.icon =
        window.getComputedStyle(this).direction === "ltr"
          ? "hass:arrow-right"
          : "hass:arrow-left";
    }, 100);
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
