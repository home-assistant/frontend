import { customElement } from "lit/decorators";
import { MdSlider } from "@material/web/slider/slider";
import { css } from "lit";

@customElement("ha-slider")
export class HaSlider extends MdSlider {
  static override styles = [
    css`
      :host {
        --md-sys-color-primary: var(--primary-color);
        --md-sys-color-outline: var(--divider-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-slider": HaSlider;
  }
}
