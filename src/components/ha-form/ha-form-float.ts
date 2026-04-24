import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { LocalizeFunc } from "../../common/translations/localize";
import "../input/ha-input";
import type { HaInput } from "../input/ha-input";
import type {
  HaFormElement,
  HaFormFloatData,
  HaFormFloatSchema,
} from "./types";

@customElement("ha-form-float")
export class HaFormFloat extends LitElement implements HaFormElement {
  @property({ attribute: false }) public localize?: LocalizeFunc;

  @property({ attribute: false }) public schema!: HaFormFloatSchema;

  @property({ attribute: false }) public data!: HaFormFloatData;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @query("ha-input", true) private _input?: HaInput;

  static shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  public reportValidity(): boolean {
    return this._input?.reportValidity() ?? true;
  }

  protected render(): TemplateResult {
    return html`
      <ha-input
        type="number"
        inputMode="decimal"
        step="any"
        .label=${this.label}
        .hint=${this.helper}
        .value=${this.data !== undefined ? this.data : ""}
        .disabled=${this.disabled}
        .required=${this.schema.required}
        .autoValidate=${this.schema.required}
        .validationMessage=${this.schema.required
          ? this.localize?.("ui.common.error_required")
          : undefined}
        @input=${this._handleInput}
      >
        ${this.schema.description?.suffix
          ? html`<span slot="end">${this.schema.description?.suffix}</span>`
          : nothing}
      </ha-input>
    `;
  }

  protected updated(changedProps: PropertyValues<this>): void {
    if (changedProps.has("schema")) {
      this.toggleAttribute("own-margin", !!this.schema.required);
    }
  }

  private _handleInput(ev: InputEvent) {
    const source = ev.target as HaInput;
    const rawValue = (source.value ?? "").replace(",", ".");

    let value: number | undefined;

    if (rawValue.endsWith(".")) {
      return;
    }

    // Allow user to keep typing decimal places (e.g., 5.0, 5.00, 5.10)
    if (rawValue.includes(".") && rawValue.endsWith("0")) {
      return;
    }

    // Allow user to start typing a negative value
    if (rawValue === "-") {
      return;
    }

    // Allow user to start typing a negative zero
    if (rawValue === "-0") {
      return;
    }

    if (rawValue !== "") {
      value = parseFloat(rawValue);
      if (isNaN(value)) {
        value = undefined;
      }
    }

    // Detect anything changed
    if (this.data === value) {
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-float": HaFormFloat;
  }
}
