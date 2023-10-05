import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import { customElement, property } from "lit/decorators";
import { HaSvgIcon } from "./ha-svg-icon";

@customElement("ha-icon-next")
export class HaIconNext extends HaSvgIcon {
  @property() public override path =
    document.dir === "ltr" ? mdiChevronRight : mdiChevronLeft;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-next": HaIconNext;
  }
}
