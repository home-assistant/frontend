import { OutlinedTextField } from "@material/web/textfield/internal/outlined-text-field";
import { styles } from "@material/web/textfield/internal/outlined-styles";
import { styles as sharedStyles } from "@material/web/textfield/internal/shared-styles";
import { css } from "lit";
import { customElement } from "lit/decorators";
import { literal } from "lit/static-html";
import "./ha-outlined-field";

@customElement("ha-outlined-text-field")
export class HaOutlinedTextField extends OutlinedTextField {
  protected readonly fieldTag = literal`ha-outlined-field`;

  static override styles = [
    sharedStyles,
    styles,
    css`
      :host {
        --md-sys-color-on-surface: var(--primary-text-color);
        --md-sys-color-primary: var(--primary-text-color);
        --md-outlined-text-field-input-text-color: var(--primary-text-color);
        --md-sys-color-on-surface-variant: var(--secondary-text-color);
        --md-outlined-field-outline-color: var(
          --md-outlined-field-outline-color,
          var(--outline-color)
        );
        --md-outlined-field-focus-outline-color: var(
          --md-outlined-field-focus-outline-color,
          var(--primary-color)
        );
        --md-outlined-field-hover-outline-color: var(
          --md-outlined-field-hover-outline-color,
          var(--outline-hover-color)
        );
      }
      :host([dense]) {
        --md-outlined-field-top-space: var(
          --md-outlined-field-top-space,
          5.5px
        );
        --md-outlined-field-bottom-space: var(
          --md-outlined-field-bottom-space,
          5.5px
        );
        --md-outlined-field-container-shape-start-start: var(
          --md-outlined-field-container-shape-start-start,
          10px
        );
        --md-outlined-field-container-shape-start-end: var(
          --md-outlined-field-container-shape-start-end,
          10px
        );
        --md-outlined-field-container-shape-end-end: var(
          --md-outlined-field-container-shape-end-end,
          10px
        );
        --md-outlined-field-container-shape-end-start: var(
          --md-outlined-field-container-shape-end-start,
          10px
        );
        --md-outlined-field-focus-outline-width: var(
          --md-outlined-field-focus-outline-width,
          1px
        );
        --md-outlined-field-with-leading-content-leading-space: var(
          --md-outlined-field-with-leading-content-leading-space,
          8px
        );
        --md-outlined-field-with-trailing-content-trailing-space: var(
          --md-outlined-field-with-trailing-content-trailing-space,
          8px
        );
        --md-outlined-field-content-space: var(
          --md-outlined-field-content-space,
          8px
        );
        --mdc-icon-size: var(--md-input-chip-icon-size, 18px);
      }
      .input {
        font-family: var(--ha-font-family-body);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-outlined-text-field": HaOutlinedTextField;
  }
}
