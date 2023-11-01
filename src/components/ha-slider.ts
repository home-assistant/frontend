import { customElement } from "lit/decorators";
import { MdSlider } from "@material/web/slider/slider";
import { CSSResult, css } from "lit";

@customElement("ha-slider")
export class HaSlider extends MdSlider {
  static override styles: CSSResult[] = [
    ...MdSlider.styles,
    css`
      :host {
        --md-sys-color-primary: var(--primary-color);
        --md-sys-color-outline: var(--outline-color);
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
