import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import { customElement } from "lit/decorators";
import { HaSvgIcon } from "./ha-svg-icon";

@customElement("ha-icon-prev")
export class HaIconPrev extends HaSvgIcon {
  path = document.dir === "ltr" ? mdiChevronLeft : mdiChevronRight;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-prev": HaIconPrev;
  }
}
