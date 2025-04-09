import { styles } from "@material/mwc-radio/mwc-radio.css";

import { RadioBase } from "@material/mwc-radio/mwc-radio-base";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-radio")
export class HaRadio extends RadioBase {
  static override styles = [
    styles,
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
