import "@polymer/paper-icon-button/paper-icon-button";
import { Constructor } from "../types";
// Not duplicate, this is for typing.
// tslint:disable-next-line
import { PaperIconButtonElement } from "@polymer/paper-icon-button/paper-icon-button";

const paperIconButtonClass = customElements.get(
  "paper-icon-button"
) as Constructor<PaperIconButtonElement>;

export class HaPaperIconButtonArrowPrev extends paperIconButtonClass {
  public hassio?: boolean;

  public connectedCallback() {
    super.connectedCallback();

    // wait to check for direction since otherwise direction is wrong even though top level is RTL
    setTimeout(() => {
      this.icon =
        window.getComputedStyle(this).direction === "ltr"
          ? this.hassio
            ? "hassio:arrow-left"
            : "hass:arrow-left"
          : this.hassio
          ? "hassio:arrow-right"
          : "hass:arrow-right";
    }, 100);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-paper-icon-button-arrow-prev": HaPaperIconButtonArrowPrev;
  }
}

customElements.define(
  "ha-paper-icon-button-arrow-prev",
  HaPaperIconButtonArrowPrev
);
