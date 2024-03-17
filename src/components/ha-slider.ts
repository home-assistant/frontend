import { customElement } from "lit/decorators";
import "element-internals-polyfill";
import { MdSlider } from "@material/web/slider/slider";
import { CSSResult, css } from "lit";
import { mainWindow } from "../common/dom/get_main_window";

@customElement("ha-slider")
export class HaSlider extends MdSlider {
  public connectedCallback() {
    super.connectedCallback();
    this.dir = mainWindow.document.dir;
  }

  static override styles: CSSResult[] = [
    ...MdSlider.styles,
    css`
      :host {
        --md-slider-handle-width: 14px;
        --md-slider-handle-height: 14px;
        min-width: 100px;
        min-inline-size: 100px;
        width: 200px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-slider": HaSlider;
  }
}
