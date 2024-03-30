import { MdOutlinedTextField } from "@material/web/textfield/outlined-text-field";
import "element-internals-polyfill";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-outlined-text-field")
export class HaOutlinedTextField extends MdOutlinedTextField {
  static override styles = [
    ...super.styles,
    css`
      :host {
        --md-sys-color-on-surface: var(--primary-text-color);
        --md-sys-color-primary: var(--primary-text-color);
        --md-outlined-text-field-input-text-color: var(--primary-text-color);
        --md-sys-color-on-surface-variant: var(--secondary-text-color);
        --md-outlined-field-outline-color: var(--outline-color);
        --md-outlined-field-focus-outline-color: var(--primary-color);
        --md-outlined-field-hover-outline-color: var(--outline-hover-color);
      }
      :host([dense]) {
        --md-outlined-field-top-space: 5.5px;
        --md-outlined-field-bottom-space: 5.5px;
        --md-outlined-field-container-shape-start-start: 10px;
        --md-outlined-field-container-shape-start-end: 10px;
        --md-outlined-field-container-shape-end-end: 10px;
        --md-outlined-field-container-shape-end-start: 10px;
        --md-outlined-field-focus-outline-width: 1px;
        --mdc-icon-size: var(--md-input-chip-icon-size, 18px);
      }
      .input {
        font-family: Roboto, sans-serif;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-outlined-text-field": HaOutlinedTextField;
  }
}
