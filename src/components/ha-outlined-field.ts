import { MdOutlinedField } from "@material/web/field/outlined-field";
import { css } from "lit";
import { customElement } from "lit/decorators";
import { literal } from "lit/static-html";

@customElement("ha-outlined-field")
export class HaOutlinedField extends MdOutlinedField {
  protected readonly fieldTag = literal`ha-outlined-field`;

  static override styles = [
    ...super.styles,
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
      .with-start .start {
        margin-inline-end: var(--ha-outlined-field-start-margin, 4px);
      }
      .with-end .end {
        margin-inline-start: var(--ha-outlined-field-end-margin, 4px);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-outlined-field": HaOutlinedField;
  }
}
