import { Radio } from "@material/mwc-radio";
import { css } from "lit";
import { customElement } from "lit/decorators";

const styles = [
  ...Radio.styles,
  css`
    :host {
      --mdc-theme-secondary: var(--primary-color);
    }
  `,
];
@customElement("ha-radio")
export class HaRadio extends Radio {
  static get styles() {
    return styles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-radio": HaRadio;
  }
}
