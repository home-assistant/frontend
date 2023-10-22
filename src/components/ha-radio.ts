import { Radio } from "@material/mwc-radio";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-radio")
export class HaRadio extends Radio {
  static override styles = [
    ...super.styles,
    css`
      :host {
        --mdc-theme-secondary: var(--primary-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-radio": HaRadio;
  }
}
