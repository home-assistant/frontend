import { Checkbox } from "@material/mwc-checkbox";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-checkbox")
export class HaCheckbox extends Checkbox {
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
    "ha-checkbox": HaCheckbox;
  }
}
