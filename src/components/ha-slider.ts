import { Slider } from "@material/web/slider/internal/slider";
import { styles } from "@material/web/slider/internal/slider-styles";
import { css } from "lit";
import { customElement } from "lit/decorators";
import { mainWindow } from "../common/dom/get_main_window";

@customElement("ha-slider")
export class HaSlider extends Slider {
  public connectedCallback() {
    super.connectedCallback();
    this.dir = mainWindow.document.dir;
  }

  static override styles = [
    styles,
    css`
      :host {
        --md-sys-color-primary: var(--primary-color);
        --md-sys-color-on-primary: var(--text-primary-color);
        --md-sys-color-outline: var(--outline-color);
        --md-sys-color-on-surface: var(--primary-text-color);
        --md-slider-handle-width: 14px;
        --md-slider-handle-height: 14px;
        --md-slider-state-layer-size: 24px;
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
