import "@polymer/iron-icon/iron-icon";
// Not duplicate, this is for typing.
// eslint-disable-next-line
import { HaIcon } from "./ha-icon";
import { mdiChevronRight, mdiChevronLeft } from "@mdi/js";

export class HaIconPrev extends HaIcon {
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
