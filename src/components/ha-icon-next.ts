import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import { customElement, property } from "lit/decorators";
import { mainWindow } from "../common/dom/get_main_window";
import { HaSvgIcon } from "./ha-svg-icon";

@customElement("ha-icon-next")
export class HaIconNext extends HaSvgIcon {
  @property() public override path =
    mainWindow.document.dir === "rtl" ? mdiChevronLeft : mdiChevronRight;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-next": HaIconNext;
  }
}
