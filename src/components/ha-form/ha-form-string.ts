import { mdiEye, mdiEyeOff } from "@mdi/js";
import "@material/mwc-textfield";
import type { TextField } from "@material/mwc-textfield";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state, query } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-svg-icon";
import type {
  HaFormElement,
  HaFormStringData,
  HaFormStringSchema,
} from "./ha-form";

const MASKED_FIELDS = ["password", "secret", "token"];

@customElement("ha-form-string")
export class HaFormString extends LitElement implements HaFormElement {
  @property() public schema!: HaFormStringSchema;

  @property() public data!: HaFormStringData;

  @property() public label!: string;

  @property() public suffix!: string;

  @state() private _unmaskedPassword = false;

  @query("mwc-textfield") private _input?: HTMLElement;

  public focus(): void {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult {
    const isPassword = MASKED_FIELDS.some((field) =>
      this.schema.name.includes(field)
    );
    return html`
      <mwc-textfield
        .type=${!isPassword
          ? this._stringType
          : this._unmaskedPassword
          ? "text"
          : "password"}
        .label=${this.label}
        .value=${this.data || ""}
        .required=${this.schema.required}
        .autoValidate=${this.schema.required}
        .suffix=${isPassword
          ? // reserve some space for the icon.
            html`<div style="width: 24px"></div>`
          : this.suffix}
        .validationMessage=${this.schema.required ? "Required" : undefined}
        @change=${this._valueChanged}
      ></mwc-textfield>
      ${isPassword
        ? html`
            <mwc-icon-button
              toggles
              title="Click to toggle between masked and clear password"
              @click=${this._toggleUnmaskedPassword}
              tabindex="-1"
              ><ha-svg-icon
                .path=${this._unmaskedPassword ? mdiEyeOff : mdiEye}
              ></ha-svg-icon>
            </mwc-icon-button>
          `
        : ""}
    `;
  }

  private _toggleUnmaskedPassword(): void {
    this._unmaskedPassword = !this._unmaskedPassword;
  }

  private _valueChanged(ev: Event): void {
    const value = (ev.target as TextField).value;
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
      :host {
        display: block;
        position: relative;
      }
      mwc-textfield {
        display: block;
      }
      mwc-icon-button {
        position: absolute;
        top: 1em;
        right: 12px;
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
