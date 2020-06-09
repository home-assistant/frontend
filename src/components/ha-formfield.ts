import "@material/mwc-formfield";
import type { Formfield } from "@material/mwc-formfield";
import { style } from "@material/mwc-formfield/mwc-formfield-css";
import { css, CSSResult, customElement } from "lit-element";
import { Constructor } from "../types";

const MwcFormfield = customElements.get("mwc-formfield") as Constructor<
  Formfield
>;

@customElement("ha-formfield")
export class HaFormfield extends MwcFormfield {
  protected static get styles(): CSSResult[] {
    return [
      style,
      css`
        ::slotted(ha-switch) {
          margin-right: 10px;
        }
        [dir="rtl"] ::slotted(ha-switch),
        ::slotted(ha-switch)[dir="rtl"] {
          margin-left: 10px;
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
