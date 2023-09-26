/* eslint-disable lit/value-after-constraints */
/* eslint-disable lit/prefer-static-styles */
import { floatingLabel } from "@material/mwc-floating-label/mwc-floating-label-directive";
import { TemplateResult, html } from "lit";
import { customElement } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { live } from "lit/directives/live";
import { HaTextField } from "../components/ha-textfield";

@customElement("ha-auth-textfield")
export class HaAuthTextField extends HaTextField {
  protected renderLabel(): TemplateResult | string {
    return !this.label
      ? ""
      : html`
          <span
            .floatingLabelFoundation=${floatingLabel(
              this.label
            ) as unknown as any}
            .id=${this.name}
            >${this.label}</span
          >
        `;
  }

  protected renderInput(shouldRenderHelperText: boolean): TemplateResult {
    const minOrUndef = this.minLength === -1 ? undefined : this.minLength;
    const maxOrUndef = this.maxLength === -1 ? undefined : this.maxLength;
    const autocapitalizeOrUndef = this.autocapitalize
      ? (this.autocapitalize as
          | "off"
          | "none"
          | "on"
          | "sentences"
          | "words"
          | "characters")
      : undefined;
    const showValidationMessage = this.validationMessage && !this.isUiValid;
    const ariaLabelledbyOrUndef = this.label ? this.name : undefined;
    const ariaControlsOrUndef = shouldRenderHelperText
      ? "helper-text"
      : undefined;
    const ariaDescribedbyOrUndef =
      this.focused || this.helperPersistent || showValidationMessage
        ? "helper-text"
        : undefined;
    // TODO: live() directive needs casting for lit-analyzer
    // https://github.com/runem/lit-analyzer/pull/91/files
    // TODO: lit-analyzer labels min/max as (number|string) instead of string
    return html` <input
      aria-labelledby=${ifDefined(ariaLabelledbyOrUndef)}
      aria-controls=${ifDefined(ariaControlsOrUndef)}
      aria-describedby=${ifDefined(ariaDescribedbyOrUndef)}
      class="mdc-text-field__input"
      type=${this.type}
      .value=${live(this.value) as unknown as string}
      ?disabled=${this.disabled}
      placeholder=${this.placeholder}
      ?required=${this.required}
      ?readonly=${this.readOnly}
      minlength=${ifDefined(minOrUndef)}
      maxlength=${ifDefined(maxOrUndef)}
      pattern=${ifDefined(this.pattern ? this.pattern : undefined)}
      min=${ifDefined(this.min === "" ? undefined : (this.min as number))}
      max=${ifDefined(this.max === "" ? undefined : (this.max as number))}
      step=${ifDefined(this.step === null ? undefined : (this.step as number))}
      size=${ifDefined(this.size === null ? undefined : this.size)}
      name=${ifDefined(this.name === "" ? undefined : this.name)}
      inputmode=${ifDefined(this.inputMode)}
      autocapitalize=${ifDefined(autocapitalizeOrUndef)}
      @input=${this.handleInputChange}
      @focus=${this.onInputFocus}
      @blur=${this.onInputBlur}
    />`;
  }

  public render() {
    return html`
      <style>
        ha-auth-textfield {
          display: inline-flex;
          flex-direction: column;
          outline: none;
        }
        ha-auth-textfield:not([disabled]):hover
          :not(.mdc-text-field--invalid):not(.mdc-text-field--focused)
          mwc-notched-outline {
          --mdc-notched-outline-border-color: var(
            --mdc-text-field-outlined-hover-border-color,
            rgba(0, 0, 0, 0.87)
          );
        }

        ha-auth-textfield:not([disabled])
          .mdc-text-field:not(.mdc-text-field--outlined) {
          background-color: var(--mdc-text-field-fill-color, whitesmoke);
        }

        ha-auth-textfield:not([disabled])
          .mdc-text-field.mdc-text-field--invalid
          mwc-notched-outline {
          --mdc-notched-outline-border-color: var(
            --mdc-text-field-error-color,
            var(--mdc-theme-error, #b00020)
          );
        }

        ha-auth-textfield:not([disabled])
          .mdc-text-field.mdc-text-field--invalid
          + .mdc-text-field-helper-line
          .mdc-text-field-character-counter,
        ha-auth-textfield:not([disabled])
          .mdc-text-field.mdc-text-field--invalid
          .mdc-text-field__icon {
          color: var(
            --mdc-text-field-error-color,
            var(--mdc-theme-error, #b00020)
          );
        }

        ha-auth-textfield:not([disabled])
          .mdc-text-field:not(.mdc-text-field--invalid):not(
            .mdc-text-field--focused
          )
          .mdc-floating-label,
        ha-auth-textfield:not([disabled])
          .mdc-text-field:not(.mdc-text-field--invalid):not(
            .mdc-text-field--focused
          )
          .mdc-floating-label::after {
          color: var(--mdc-text-field-label-ink-color, rgba(0, 0, 0, 0.6));
        }

        ha-auth-textfield:not([disabled])
          .mdc-text-field.mdc-text-field--focused
          mwc-notched-outline {
          --mdc-notched-outline-stroke-width: 2px;
        }

        ha-auth-textfield:not([disabled])
          .mdc-text-field.mdc-text-field--focused:not(.mdc-text-field--invalid)
          mwc-notched-outline {
          --mdc-notched-outline-border-color: var(
            --mdc-text-field-focused-label-color,
            var(--mdc-theme-primary, rgba(98, 0, 238, 0.87))
          );
        }

        ha-auth-textfield:not([disabled])
          .mdc-text-field.mdc-text-field--focused:not(.mdc-text-field--invalid)
          .mdc-floating-label {
          color: #6200ee;
          color: var(--mdc-theme-primary, #6200ee);
        }

        ha-auth-textfield:not([disabled])
          .mdc-text-field
          .mdc-text-field__input {
          color: var(--mdc-text-field-ink-color, rgba(0, 0, 0, 0.87));
        }

        ha-auth-textfield:not([disabled])
          .mdc-text-field
          .mdc-text-field__input::placeholder {
          color: var(--mdc-text-field-label-ink-color, rgba(0, 0, 0, 0.6));
        }

        ha-auth-textfield:not([disabled])
          .mdc-text-field-helper-line
          .mdc-text-field-helper-text:not(
            .mdc-text-field-helper-text--validation-msg
          ),
        ha-auth-textfield:not([disabled])
          .mdc-text-field-helper-line:not(.mdc-text-field--invalid)
          .mdc-text-field-character-counter {
          color: var(--mdc-text-field-label-ink-color, rgba(0, 0, 0, 0.6));
        }

        ha-auth-textfield[disabled]
          .mdc-text-field:not(.mdc-text-field--outlined) {
          background-color: var(--mdc-text-field-disabled-fill-color, #fafafa);
        }

        ha-auth-textfield[disabled]
          .mdc-text-field.mdc-text-field--outlined
          mwc-notched-outline {
          --mdc-notched-outline-border-color: var(
            --mdc-text-field-outlined-disabled-border-color,
            rgba(0, 0, 0, 0.06)
          );
        }

        ha-auth-textfield[disabled]
          .mdc-text-field:not(.mdc-text-field--invalid):not(
            .mdc-text-field--focused
          )
          .mdc-floating-label,
        ha-auth-textfield[disabled]
          .mdc-text-field:not(.mdc-text-field--invalid):not(
            .mdc-text-field--focused
          )
          .mdc-floating-label::after {
          color: var(--mdc-text-field-disabled-ink-color, rgba(0, 0, 0, 0.38));
        }

        ha-auth-textfield[disabled] .mdc-text-field .mdc-text-field__input,
        ha-auth-textfield[disabled]
          .mdc-text-field
          .mdc-text-field__input::placeholder {
          color: var(--mdc-text-field-disabled-ink-color, rgba(0, 0, 0, 0.38));
        }

        ha-auth-textfield[disabled]
          .mdc-text-field-helper-line
          .mdc-text-field-helper-text,
        ha-auth-textfield[disabled]
          .mdc-text-field-helper-line
          .mdc-text-field-character-counter {
          color: var(--mdc-text-field-disabled-ink-color, rgba(0, 0, 0, 0.38));
        }
        ha-auth-textfield:not([disabled])
          .mdc-text-field.mdc-text-field--focused:not(.mdc-text-field--invalid)
          .mdc-floating-label {
          color: var(--mdc-theme-primary, #6200ee);
        }
        ha-auth-textfield[no-spinner] input::-webkit-outer-spin-button,
        ha-auth-textfield[no-spinner] input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        /* Firefox */
        ha-auth-textfield[no-spinner] input[type="number"] {
          -moz-appearance: textfield;
        }
      </style>
      ${super.render()}
    `;
  }

  protected createRenderRoot() {
    // add parent style to light dom
    const style = document.createElement("style");
    style.textContent = HaTextField.elementStyles as unknown as string;
    this.append(style);
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-auth-textfield": HaAuthTextField;
  }
}
