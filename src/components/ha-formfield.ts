import { FormfieldBase } from "@material/mwc-formfield/mwc-formfield-base";
import { styles } from "@material/mwc-formfield/mwc-formfield.css";
import { css } from "lit";
import { customElement } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";

@customElement("ha-formfield")
export class HaFormfield extends FormfieldBase {
  protected _labelClick() {
    const input = this.input;
    if (input) {
      input.focus();
      switch (input.tagName) {
        case "HA-CHECKBOX":
        case "HA-RADIO":
          (input as any).checked = !(input as any).checked;
          fireEvent(input, "change");
          break;
        default:
          input.click();
          break;
      }
    }
  }

  static override styles = [
    styles,
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

declare global {
  interface HTMLElementTagNameMap {
    "ha-formfield": HaFormfield;
  }
}
