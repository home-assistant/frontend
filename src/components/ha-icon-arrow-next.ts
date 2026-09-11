import { mdiArrowLeft, mdiArrowRight } from "@mdi/js";
import { customElement, property } from "lit/decorators";
import { mainWindow } from "../common/dom/get_main_window";
import { HaSvgIcon } from "./ha-svg-icon";

@customElement("ha-icon-arrow-next")
export class HaIconArrowNext extends HaSvgIcon {
  @property() public override path =
    mainWindow.document.dir === "rtl" ? mdiArrowLeft : mdiArrowRight;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-arrow-next": HaIconArrowNext;
  }
}
