import { mdiArrowLeft, mdiArrowRight } from "@mdi/js";
import { customElement, property } from "lit/decorators";
import { mainWindow } from "../common/dom/get_main_window";
import { HaSvgIcon } from "./ha-svg-icon";

@customElement("ha-icon-arrow-prev")
export class HaIconArrowPrev extends HaSvgIcon {
  @property() public override path =
    mainWindow.document.dir === "rtl" ? mdiArrowRight : mdiArrowLeft;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-arrow-prev": HaIconArrowPrev;
  }
}
