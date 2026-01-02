import { FormfieldBase } from "@material/mwc-formfield/mwc-formfield-base";
import { styles } from "@material/mwc-formfield/mwc-formfield.css";
import { css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../common/dom/fire_event";

@customElement("ha-formfield")
export class HaFormfield extends FormfieldBase {
  @property({ type: Boolean, reflect: true }) public disabled = false;

  protected override render() {
    const classes = {
      "mdc-form-field--align-end": this.alignEnd,
      "mdc-form-field--space-between": this.spaceBetween,
      "mdc-form-field--nowrap": this.nowrap,
    };

    return html` <div class="mdc-form-field ${classMap(classes)}">
      <slot></slot>
      <label class="mdc-label" @click=${this._labelClick}>
        <slot name="label">${this.label}</slot>
      </label>
    </div>`;
  }

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
      .mdc-form-field {
        align-items: var(--ha-formfield-align-items, center);
        gap: var(--ha-space-1);
      }
      .mdc-form-field > label {
        direction: var(--direction);
        margin-inline-start: 0;
        margin-inline-end: auto;
        padding: 0;
      }
      :host([disabled]) label {
        color: var(--disabled-text-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-formfield": HaFormfield;
  }
}
