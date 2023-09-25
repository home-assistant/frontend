/* eslint-disable lit/prefer-static-styles */
import { html } from "lit";
import { customElement } from "lit/decorators";
import { HaTextField } from "../components/ha-textfield";

@customElement("ha-auth-textfield")
export class HaAuthTextField extends HaTextField {
  public render() {
    return html`
      <style>
        ha-auth-textfield {
          display: inline-flex;
          flex-direction: column;
          outline: none
        }
        ha-auth-textfield:not([disabled]):hover :not(.mdc-text-field--invalid):not(.mdc-text-field--focused) mwc-notched-outline {
          --mdc-notched-outline-border-color: var( --mdc-text-field-outlined-hover-border-color, rgba(0, 0, 0, 0.87))
        }

        ha-auth-textfield:not([disabled]) .mdc-text-field:not(.mdc-text-field--outlined) {
          background-color: var(--mdc-text-field-fill-color, whitesmoke)
        }

        ha-auth-textfield:not([disabled]) .mdc-text-field.mdc-text-field--invalid mwc-notched-outline {
          --mdc-notched-outline-border-color: var( --mdc-text-field-error-color, var(--mdc-theme-error, #b00020))
        }

        ha-auth-textfield:not([disabled]) .mdc-text-field.mdc-text-field--invalid+.mdc-text-field-helper-line .mdc-text-field-character-counter,
        ha-auth-textfield:not([disabled]) .mdc-text-field.mdc-text-field--invalid .mdc-text-field__icon {
          color: var(--mdc-text-field-error-color, var(--mdc-theme-error, #b00020))
        }

        ha-auth-textfield:not([disabled]) .mdc-text-field:not(.mdc-text-field--invalid):not(.mdc-text-field--focused) .mdc-floating-label,
        ha-auth-textfield:not([disabled]) .mdc-text-field:not(.mdc-text-field--invalid):not(.mdc-text-field--focused) .mdc-floating-label::after {
          color: var(--mdc-text-field-label-ink-color, rgba(0, 0, 0, 0.6))
        }

        ha-auth-textfield:not([disabled]) .mdc-text-field.mdc-text-field--focused mwc-notched-outline {
          --mdc-notched-outline-stroke-width: 2px
        }

        ha-auth-textfield:not([disabled]) .mdc-text-field.mdc-text-field--focused:not(.mdc-text-field--invalid) mwc-notched-outline {
          --mdc-notched-outline-border-color: var( --mdc-text-field-focused-label-color, var(--mdc-theme-primary, rgba(98, 0, 238, 0.87)))
        }

        ha-auth-textfield:not([disabled]) .mdc-text-field.mdc-text-field--focused:not(.mdc-text-field--invalid) .mdc-floating-label {
          color: #6200ee;
          color: var(--mdc-theme-primary, #6200ee)
        }

        ha-auth-textfield:not([disabled]) .mdc-text-field .mdc-text-field__input {
          color: var(--mdc-text-field-ink-color, rgba(0, 0, 0, 0.87))
        }

        ha-auth-textfield:not([disabled]) .mdc-text-field .mdc-text-field__input::placeholder {
          color: var(--mdc-text-field-label-ink-color, rgba(0, 0, 0, 0.6))
        }

        ha-auth-textfield:not([disabled]) .mdc-text-field-helper-line .mdc-text-field-helper-text:not(.mdc-text-field-helper-text--validation-msg),
        ha-auth-textfield:not([disabled]) .mdc-text-field-helper-line:not(.mdc-text-field--invalid) .mdc-text-field-character-counter {
          color: var(--mdc-text-field-label-ink-color, rgba(0, 0, 0, 0.6))
        }

        ha-auth-textfield[disabled] .mdc-text-field:not(.mdc-text-field--outlined) {
          background-color: var(--mdc-text-field-disabled-fill-color, #fafafa)
        }

        ha-auth-textfield[disabled] .mdc-text-field.mdc-text-field--outlined mwc-notched-outline {
          --mdc-notched-outline-border-color: var( --mdc-text-field-outlined-disabled-border-color, rgba(0, 0, 0, 0.06))
        }

        ha-auth-textfield[disabled] .mdc-text-field:not(.mdc-text-field--invalid):not(.mdc-text-field--focused) .mdc-floating-label,
        ha-auth-textfield[disabled] .mdc-text-field:not(.mdc-text-field--invalid):not(.mdc-text-field--focused) .mdc-floating-label::after {
          color: var(--mdc-text-field-disabled-ink-color, rgba(0, 0, 0, 0.38))
        }

        ha-auth-textfield[disabled] .mdc-text-field .mdc-text-field__input,
        ha-auth-textfield[disabled] .mdc-text-field .mdc-text-field__input::placeholder {
          color: var(--mdc-text-field-disabled-ink-color, rgba(0, 0, 0, 0.38))
        }

        ha-auth-textfield[disabled] .mdc-text-field-helper-line .mdc-text-field-helper-text,
        ha-auth-textfield[disabled] .mdc-text-field-helper-line .mdc-text-field-character-counter {
          color: var(--mdc-text-field-disabled-ink-color, rgba(0, 0, 0, 0.38))
        }
        ha-auth-textfield:not([disabled]) .mdc-text-field.mdc-text-field--focused:not(.mdc-text-field--invalid) .mdc-floating-label {
          color: var(--mdc-theme-primary,#6200ee)
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
        ${HaAuthTextField.styles}
      </style>
      ${super.render()}
    `;
  }

  protected createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-auth-textfield": HaAuthTextField;
  }
}
