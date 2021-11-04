import "@material/mwc-textfield";
import type { TextField } from "@material/mwc-textfield";
import { css, html, LitElement, TemplateResult, PropertyValues } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { HaFormElement, HaFormFloatData, HaFormFloatSchema } from "./types";

@customElement("ha-form-float")
export class HaFormFloat extends LitElement implements HaFormElement {
  @property() public schema!: HaFormFloatSchema;

  @property() public data!: HaFormFloatData;

  @property() public label!: string;

  @property({ type: Boolean }) public disabled = false;

  @query("mwc-textfield") private _input?: HTMLElement;

  public focus() {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult {
    return html`
      <mwc-textfield
        inputMode="decimal"
        .label=${this.label}
        .value=${this.data !== undefined ? this.data : ""}
        .disabled=${this.disabled}
        .required=${this.schema.required}
        .autoValidate=${this.schema.required}
        .suffix=${this.schema.description?.suffix}
        .validationMessage=${this.schema.required ? "Required" : undefined}
        @input=${this._valueChanged}
      ></mwc-textfield>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    if (changedProps.has("schema")) {
      this.toggleAttribute("own-margin", !!this.schema.required);
    }
  }

  private _valueChanged(ev: Event) {
    const source = ev.target as TextField;
    const rawValue = source.value;

    let value: number | undefined;

    if (rawValue !== "") {
      value = parseFloat(rawValue);
    }

    // Detect anything changed
    if (this.data === value) {
      // parseFloat will drop invalid text at the end, in that case update textfield
      const newRawValue = value === undefined ? "" : String(value);
      if (source.value !== newRawValue) {
        source.value = newRawValue;
        return;
      }
      return;
    }

    fireEvent(this, "value-changed", {
      value,
    });
  }

  static styles = css`
    :host([own-margin]) {
      margin-bottom: 5px;
    }
    mwc-textfield {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-float": HaFormFloat;
  }
}
