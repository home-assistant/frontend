import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import { HaSvgIcon } from "./ha-svg-icon";

export class HaIconPrev extends HaSvgIcon {
  public connectedCallback() {
    super.connectedCallback();

    // wait to check for direction since otherwise direction is wrong even though top level is RTL
    setTimeout(() => {
      this.path =
        window.getComputedStyle(this).direction === "ltr"
          ? mdiChevronLeft
          : mdiChevronRight;
    }, 100);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-prev": HaIconPrev;
  }
}

customElements.define("ha-icon-prev", HaIconPrev);
