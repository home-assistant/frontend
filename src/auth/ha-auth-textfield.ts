/* eslint-disable lit/prefer-static-styles */
import { mdiEye, mdiEyeOff } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { stopPropagation } from "../common/dom/stop_propagation";
import "../components/ha-icon-button";
import { WaInputMixin } from "../components/input/wa-input-mixin";

/**
 * Text field for the login page. It renders the native input in the light DOM
 * so browsers and password manager extensions can find it (#51620).
 */
@customElement("ha-auth-textfield")
export class HaAuthTextField extends WaInputMixin(LitElement) {
  @property() public type: "text" | "password" | "email" | "url" = "text";

  @property({ type: Boolean, attribute: "password-toggle" })
  public passwordToggle = false;

  @property({ attribute: false }) public showPasswordLabel?: string;

  @property({ attribute: false }) public hidePasswordLabel?: string;

  @state() private _passwordVisible = false;

  @query("input") private _input?: HTMLInputElement;

  protected override get _formControl(): HTMLInputElement | undefined {
    return this._input;
  }

  protected override createRenderRoot() {
    return this;
  }

  protected override firstUpdated(changedProps: PropertyValues<this>): void {
    super.firstUpdated(changedProps);
    if (this.autofocus) {
      this.focus();
    }
  }

  public override focus(): void {
    this._input?.focus();
  }

  public override checkValidity(): boolean {
    return this._input?.checkValidity() ?? true;
  }

  public override reportValidity(): boolean {
    // Adopt a value a password manager wrote to the input without events.
    this._handleInput();
    return super.reportValidity();
  }

  protected override render(): TemplateResult {
    const invalid = this.invalid || this._invalid;
    const hintId = this.name ? `${this.name}-hint` : undefined;

    // The blank placeholder lets :placeholder-shown raise the label when a
    // password manager fills the field without firing events.
    return html`
      <style>
        ha-auth-textfield {
          display: block;
          padding-bottom: var(--ha-space-2);
          text-align: start;
        }
        ha-auth-textfield .base {
          position: relative;
          display: flex;
          align-items: center;
          box-sizing: border-box;
          height: 56px;
          padding: 0 var(--ha-space-4);
          background-color: var(--ha-color-form-background);
          border-radius: var(--ha-border-radius-sm) var(--ha-border-radius-sm)
            var(--ha-border-radius-square) var(--ha-border-radius-square);
          cursor: text;
          transition: background-color var(--wa-transition-normal) ease-in-out;
        }
        ha-auth-textfield .base:hover {
          background-color: var(--ha-color-form-background-hover);
        }
        ha-auth-textfield .base.disabled {
          background-color: var(--ha-color-form-background-disabled);
          opacity: 0.5;
          cursor: not-allowed;
        }
        ha-auth-textfield .base::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 1px;
          background-color: var(--ha-color-border-neutral-loud);
          transition:
            height var(--wa-transition-normal) ease-in-out,
            background-color var(--wa-transition-normal) ease-in-out;
        }
        ha-auth-textfield .base:focus-within::after {
          height: 2px;
          background-color: var(--primary-color);
        }
        ha-auth-textfield .base.invalid:not(.disabled)::after {
          background-color: var(--ha-color-border-danger-normal);
        }
        ha-auth-textfield label {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1;
          padding: var(--ha-space-5) var(--ha-space-4) 0;
          pointer-events: none;
          font-family: var(--ha-font-family-body);
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
          color: var(--secondary-text-color);
          transition: all var(--wa-transition-normal) ease-in-out;
        }
        ha-auth-textfield input:focus + label,
        ha-auth-textfield input:not(:placeholder-shown) + label {
          padding-top: var(--ha-space-3);
          font-size: var(--ha-font-size-xs);
        }
        ha-auth-textfield .base:focus-within label {
          color: var(--primary-color);
        }
        ha-auth-textfield .base.invalid:not(.disabled) label {
          color: var(--ha-color-fill-danger-loud-resting);
        }
        ha-auth-textfield .base.disabled label {
          opacity: 0.5;
        }
        ha-auth-textfield input {
          flex: 1 1 auto;
          min-width: 0;
          height: 100%;
          margin: 0;
          padding: var(--ha-space-3) 0 0;
          border: none;
          outline: none;
          box-shadow: none;
          background: transparent;
          color: var(--primary-text-color);
          font-family: var(--ha-font-family-body);
          font-size: var(--ha-font-size-m);
          -webkit-appearance: none;
          box-sizing: border-box;
        }
        ha-auth-textfield input:-webkit-autofill,
        ha-auth-textfield input:-webkit-autofill:hover,
        ha-auth-textfield input:-webkit-autofill:focus,
        ha-auth-textfield input:-webkit-autofill:active {
          -webkit-background-clip: text;
          -webkit-text-fill-color: var(--primary-text-color);
          background-color: transparent;
          box-shadow: none;
          caret-color: var(--primary-text-color);
        }
        ha-auth-textfield input::-ms-reveal {
          display: none;
        }
        ha-auth-textfield ha-icon-button {
          display: flex;
          align-items: center;
          color: var(--ha-color-text-secondary);
        }
        ha-auth-textfield .hint {
          display: flex;
          align-items: center;
          min-height: var(--ha-space-5);
          margin-inline-start: var(--ha-space-3);
          font-size: var(--ha-font-size-s);
          color: var(--ha-color-text-secondary);
        }
        ha-auth-textfield .hint.error {
          color: var(--ha-color-on-danger-quiet);
        }
      </style>
      <div class=${classMap({ base: true, invalid, disabled: this.disabled })}>
        <input
          id=${ifDefined(this.name)}
          name=${ifDefined(this.name)}
          type=${
            this.type === "password" && this._passwordVisible
              ? "text"
              : this.type
          }
          placeholder=" "
          autocomplete=${ifDefined(this.autocomplete)}
          ?required=${this.required}
          ?disabled=${this.disabled}
          .value=${this.value ?? ""}
          aria-describedby=${ifDefined(hintId)}
          aria-invalid=${ifDefined(invalid ? "true" : undefined)}
          @input=${this._handleInput}
          @change=${this._handleChange}
          @blur=${this._handleBlur}
        />
        <label for=${ifDefined(this.name)}
          >${this._renderLabel(this.label ?? "", this.required)}</label
        >
        ${
          this.passwordToggle && !this.disabled
            ? html`<ha-icon-button
                .path=${this._passwordVisible ? mdiEyeOff : mdiEye}
                .label=${
                  this._passwordVisible
                    ? this.hidePasswordLabel
                    : this.showPasswordLabel
                }
                @click=${this._togglePasswordVisibility}
                @keypress=${stopPropagation}
              ></ha-icon-button>`
            : nothing
        }
      </div>
      <div
        id=${ifDefined(hintId)}
        class=${classMap({ hint: true, error: invalid })}
        role=${ifDefined(invalid ? "alert" : undefined)}
        aria-live="polite"
      >
        ${
          invalid
            ? this.validationMessage || this._input?.validationMessage
            : this.hint
        }
      </div>
    `;
  }

  private _togglePasswordVisibility(): void {
    this._passwordVisible = !this._passwordVisible;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-auth-textfield": HaAuthTextField;
  }
}
