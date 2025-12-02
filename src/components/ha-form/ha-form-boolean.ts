import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type {
  HaFormBooleanData,
  HaFormBooleanSchema,
  HaFormElement,
} from "./types";
import type { HaCheckbox } from "../ha-checkbox";
import "../ha-checkbox";
import "../ha-formfield";

@customElement("ha-form-boolean")
export class HaFormBoolean extends LitElement implements HaFormElement {
  @property({ attribute: false }) public schema!: HaFormBooleanSchema;

  @property({ attribute: false }) public data!: HaFormBooleanData;

  @property() public label!: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @query("ha-checkbox", true) private _input?: HTMLElement;

  public focus() {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult {
    return html`
      <ha-formfield .label=${this.label}>
        <ha-checkbox
          .checked=${this.data}
          .disabled=${this.disabled}
          @change=${this._valueChanged}
        ></ha-checkbox>
        <span slot="label">
          <p class="primary">${this.label}</p>
          ${this.helper
            ? html`<p class="secondary">${this.helper}</p>`
            : nothing}
        </span>
      </ha-formfield>
    `;
  }

  private _valueChanged(ev: Event) {
    fireEvent(this, "value-changed", {
      value: (ev.target as HaCheckbox).checked,
    });
  }

  static styles = css`
    ha-formfield {
      display: flex;
      min-height: 56px;
      align-items: center;
      --mdc-typography-body2-font-size: 1em;
    }
    p {
      margin: 0;
    }
    .secondary {
      direction: var(--direction);
      padding-top: 4px;
      box-sizing: border-box;
      color: var(--secondary-text-color);
      font-size: 0.875rem;
      font-weight: var(
        --mdc-typography-body2-font-weight,
        var(--ha-font-weight-normal)
      );
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-boolean": HaFormBoolean;
  }
}
