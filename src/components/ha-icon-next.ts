import "@polymer/iron-icon/iron-icon";
// Not duplicate, this is for typing.
// eslint-disable-next-line
import { HaIcon } from "./ha-icon";
import { mdiChevronRight, mdiChevronLeft } from "@mdi/js";

export class HaIconNext extends HaIcon {
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
