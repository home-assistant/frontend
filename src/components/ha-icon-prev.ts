import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import { customElement } from "lit/decorators";
import { HaSvgIcon } from "./ha-svg-icon";

@customElement("ha-icon-prev")
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
