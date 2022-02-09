import { CheckboxBase } from "@material/mwc-checkbox/mwc-checkbox-base";
import { styles } from "@material/mwc-checkbox/mwc-checkbox.css";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-checkbox")
export class HaCheckbox extends CheckboxBase {
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
    "ha-checkbox": HaCheckbox;
  }
}
