import "@polymer/iron-icon/iron-icon";
// Not duplicate, this is for typing.
// tslint:disable-next-line
import { HaIcon } from "./ha-icon";

export class HaIconNext extends HaIcon {
  public connectedCallback() {
    this.icon =
      window.getComputedStyle(this).direction === "ltr"
        ? "hass:chevron-right"
        : "hass:chevron-left";

    super.connectedCallback();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-next": HaIconNext;
  }
}

customElements.define("ha-icon-next", HaIconNext);
