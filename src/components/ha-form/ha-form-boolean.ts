import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-checkbox";
import type { HaCheckbox } from "../ha-checkbox";
import type {
  HaFormBooleanData,
  HaFormBooleanSchema,
  HaFormElement,
} from "./types";

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
      <ha-checkbox
        .checked=${this.data}
        .disabled=${this.disabled}
        @change=${this._valueChanged}
        .hint=${this.helper}
      >
        ${this.label}
      </ha-checkbox>
    `;
  }

  private _valueChanged(ev: Event) {
    fireEvent(this, "value-changed", {
      value: (ev.target as HaCheckbox).checked,
    });
  }

  static styles = css`
    ha-checkbox {
      min-height: 56px;
      justify-content: center;
    }
    ha-checkbox::part(base) {
      align-items: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-boolean": HaFormBoolean;
  }
}
