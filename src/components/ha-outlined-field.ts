import { OutlinedField } from "@material/web/field/internal/outlined-field";
import { styles } from "@material/web/field/internal/outlined-styles";
import { styles as sharedStyles } from "@material/web/field/internal/shared-styles";
import { css } from "lit";
import { customElement } from "lit/decorators";
import { literal } from "lit/static-html";

@customElement("ha-outlined-field")
export class HaOutlinedField extends OutlinedField {
  protected readonly fieldTag = literal`ha-outlined-field`;

  static override styles = [
    sharedStyles,
    styles,
    css`
      .container::before {
        display: block;
        content: "";
        position: absolute;
        inset: 0;
        background-color: var(--ha-outlined-field-container-color, transparent);
        opacity: var(--ha-outlined-field-container-opacity, 1);
        border-start-start-radius: var(--_container-shape-start-start);
        border-start-end-radius: var(--_container-shape-start-end);
        border-end-start-radius: var(--_container-shape-end-start);
        border-end-end-radius: var(--_container-shape-end-end);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-outlined-field": HaOutlinedField;
  }
}
