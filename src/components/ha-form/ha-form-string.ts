import "@material/mwc-icon-button/mwc-icon-button";
import { mdiEye, mdiEyeOff } from "@mdi/js";
import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state, query } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-svg-icon";
import type {
  HaFormElement,
  HaFormStringData,
  HaFormStringSchema,
} from "./ha-form";

@customElement("ha-form-string")
export class HaFormString extends LitElement implements HaFormElement {
  @property() public schema!: HaFormStringSchema;

  @property() public data!: HaFormStringData;

  @property() public label!: string;

  @property() public suffix!: string;

  @state() private _unmaskedPassword = false;

  @query("paper-input") private _input?: HTMLElement;

  public focus(): void {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult {
    return this.schema.name.includes("password")
      ? html`
          <paper-input
            .type=${this._unmaskedPassword ? "text" : "password"}
            .label=${this.label}
            .value=${this.data}
            .required=${this.schema.required}
            .autoValidate=${this.schema.required}
            @value-changed=${this._valueChanged}
          >
            <mwc-icon-button
              toggles
              slot="suffix"
              id="iconButton"
              title="Click to toggle between masked and clear password"
              @click=${this._toggleUnmaskedPassword}
              tabindex="-1"
              ><ha-svg-icon
                .path=${this._unmaskedPassword ? mdiEyeOff : mdiEye}
              ></ha-svg-icon>
            </mwc-icon-button>
          </paper-input>
        `
      : html`
          <paper-input
            .type=${this._stringType}
            .label=${this.label}
            .value=${this.data}
            .required=${this.schema.required}
            .autoValidate=${this.schema.required}
            error-message="Required"
            @value-changed=${this._valueChanged}
          ></paper-input>
        `;
  }

  private _toggleUnmaskedPassword(): void {
    this._unmaskedPassword = !this._unmaskedPassword;
  }

  private _valueChanged(ev: Event): void {
    const value = (ev.target as PaperInputElement).value;
    if (this.data === value) {
      return;
    }
    fireEvent(this, "value-changed", {
      value,
    });
  }

  private get _stringType(): string {
    if (this.schema.format) {
      if (["email", "url"].includes(this.schema.format)) {
        return this.schema.format;
      }
      if (this.schema.format === "fqdnurl") {
        return "url";
      }
    }
    return "text";
  }

  static get styles(): CSSResultGroup {
    return css`
      mwc-icon-button {
        --mdc-icon-button-size: 24px;
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-string": HaFormString;
  }
}
