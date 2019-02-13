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
    super.connectedCallback();

    this.icon =
      window.getComputedStyle(this).direction === "ltr"
        ? "hass:arrow-right"
        : "hass:arrow-left";
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
