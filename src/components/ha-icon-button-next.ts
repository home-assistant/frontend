import { HaIconButton } from "./ha-icon-button";

export class HaIconButtonNext extends HaIconButton {
  public connectedCallback() {
    super.connectedCallback();

    // wait to check for direction since otherwise direction is wrong even though top level is RTL
    setTimeout(() => {
      this.icon =
        window.getComputedStyle(this).direction === "ltr"
          ? "hass:chevron-right"
          : "hass:chevron-left";
    }, 100);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-button-next": HaIconButtonNext;
  }
}

customElements.define("ha-icon-button-next", HaIconButtonNext);
