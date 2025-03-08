import type { TemplateResult, PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { HaTextField } from "../ha-textfield";
import "../ha-textfield";
import type {
  HaFormElement,
  HaFormFloatData,
  HaFormFloatSchema,
} from "./types";
import type { LocalizeFunc } from "../../common/translations/localize";

@customElement("ha-form-float")
export class HaFormFloat extends LitElement implements HaFormElement {
  @property({ attribute: false }) public localize?: LocalizeFunc;

  @property({ attribute: false }) public schema!: HaFormFloatSchema;

  @property({ attribute: false }) public data!: HaFormFloatData;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @query("ha-textfield") private _input?: HaTextField;

  public focus() {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult {
    return html`
      <ha-textfield
        type="number"
        inputMode="decimal"
        step="any"
        .label=${this.label}
        .helper=${this.helper}
        helperPersistent
        .value=${this.data !== undefined ? this.data : ""}
        .disabled=${this.disabled}
        .required=${this.schema.required}
        .autoValidate=${this.schema.required}
        .suffix=${this.schema.description?.suffix}
        .validationMessage=${this.schema.required
          ? this.localize?.("ui.common.error_required")
          : undefined}
        @input=${this._valueChanged}
      ></ha-textfield>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    if (changedProps.has("schema")) {
      this.toggleAttribute("own-margin", !!this.schema.required);
    }
  }

  private _valueChanged(ev: Event) {
    const source = ev.target as HaTextField;
    const rawValue = source.value.replace(",", ".");

    let value: number | undefined;

    if (rawValue.endsWith(".")) {
      return;
    }

    // Allow user to start typing a negative value
    if (rawValue === "-") {
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
    ha-textfield {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-float": HaFormFloat;
  }
}
