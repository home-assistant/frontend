import { Formfield } from "@material/mwc-formfield";
import { css, CSSResultGroup } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-formfield")
// @ts-expect-error
export class HaFormfield extends Formfield {
  protected static get styles(): CSSResultGroup {
    return [
      Formfield.styles,
      css`
        :host(:not([alignEnd])) ::slotted(ha-switch) {
          margin-right: 10px;
        }
        :host([dir="rtl"]:not([alignEnd])) ::slotted(ha-switch) {
          margin-left: 10px;
          margin-right: auto;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-formfield": HaFormfield;
  }
}
