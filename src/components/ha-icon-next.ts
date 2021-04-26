import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import { HaSvgIcon } from "./ha-svg-icon";

export class HaIconNext extends HaSvgIcon {
  public connectedCallback() {
    super.connectedCallback();

    // wait to check for direction since otherwise direction is wrong even though top level is RTL
    setTimeout(() => {
      this.path =
        window.getComputedStyle(this).direction === "ltr"
          ? mdiChevronRight
          : mdiChevronLeft;
    }, 100);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-next": HaIconNext;
  }
}

customElements.define("ha-icon-next", HaIconNext);
