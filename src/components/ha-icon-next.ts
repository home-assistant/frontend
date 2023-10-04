import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import { PropertyValues } from "lit";
import { customElement } from "lit/decorators";
import { HaSvgIcon } from "./ha-svg-icon";

@customElement("ha-icon-next")
export class HaIconNext extends HaSvgIcon {
  protected willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    this.path = document.dir === "ltr" ? mdiChevronRight : mdiChevronLeft;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-next": HaIconNext;
  }
}
