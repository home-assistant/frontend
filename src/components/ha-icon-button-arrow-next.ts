import { HaIconButton } from "./ha-icon-button";

export class HaIconButtonArrowNext extends HaIconButton {
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
    "ha-icon-button-arrow-next": HaIconButtonArrowNext;
  }
}

customElements.define("ha-icon-button-arrow-next", HaIconButtonArrowNext);
