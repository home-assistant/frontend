import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import { customElement, property } from "lit/decorators";
import { mainWindow } from "../common/dom/get_main_window";
import { HaSvgIcon } from "./ha-svg-icon";

@customElement("ha-icon-prev")
export class HaIconPrev extends HaSvgIcon {
  @property() public override path =
    mainWindow.document.dir === "rtl" ? mdiChevronRight : mdiChevronLeft;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-prev": HaIconPrev;
  }
}
