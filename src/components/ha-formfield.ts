import { FormfieldBase } from "@material/mwc-formfield/mwc-formfield-base";
import { styles } from "@material/mwc-formfield/mwc-formfield.css";
import { css } from "lit";
import { customElement } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";

@customElement("ha-formfield")
export class HaFormfield extends FormfieldBase {
  protected _labelClick() {
    const input = this.input as HTMLInputElement | undefined;
    if (!input) return;

    input.focus();
    if (input.disabled) {
      return;
    }
    switch (input.tagName) {
      case "HA-CHECKBOX":
        input.checked = !input.checked;
        fireEvent(input, "change");
        break;
      case "HA-RADIO":
        input.checked = true;
        fireEvent(input, "change");
        break;
      default:
        input.click();
        break;
    }
  }

  static override styles = [
    styles,
    css`
      :host(:not([alignEnd])) ::slotted(ha-switch) {
        margin-right: 10px;
        margin-inline-end: 10px;
        margin-inline-start: inline;
      }
      .mdc-form-field > label {
        direction: var(--direction);
        margin-inline-start: 0;
        margin-inline-end: auto;
        padding-inline-start: 4px;
        padding-inline-end: 0;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-formfield": HaFormfield;
  }
}
