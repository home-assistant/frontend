import { TextAreaBase } from "@material/mwc-textarea/mwc-textarea-base";
import { styles as textfieldStyles } from "@material/mwc-textfield/mwc-textfield.css";
import { styles as textareaStyles } from "@material/mwc-textarea/mwc-textarea.css";
import type { PropertyValues } from "lit";
import { css } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-textarea")
export class HaTextArea extends TextAreaBase {
  @property({ type: Boolean, reflect: true }) autogrow = false;

  updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (this.autogrow && changedProperties.has("value")) {
      this.mdcRoot.dataset.value = this.value + '=\u200B"'; // add a zero-width space to correctly wrap
    }
  }

  static override styles = [
    textfieldStyles,
    textareaStyles,
    css`
      :host([autogrow]) .mdc-text-field {
        position: relative;
        min-height: 74px;
        min-width: 178px;
        max-height: 200px;
      }
      :host([autogrow]) .mdc-text-field:after {
        content: attr(data-value);
        margin-top: 23px;
        margin-bottom: 9px;
        line-height: var(--ha-line-height-normal);
        min-height: 42px;
        padding: 0px 32px 0 16px;
        letter-spacing: var(
          --mdc-typography-subtitle1-letter-spacing,
          0.009375em
        );
        visibility: hidden;
        white-space: pre-wrap;
      }
      :host([autogrow]) .mdc-text-field__input {
        position: absolute;
        height: calc(100% - 32px);
      }
      :host([autogrow]) .mdc-text-field.mdc-text-field--no-label:after {
        margin-top: 16px;
        margin-bottom: 16px;
      }
      .mdc-floating-label {
        inset-inline-start: 16px !important;
        inset-inline-end: initial !important;
        transform-origin: var(--float-start) top;
      }
      @media only screen and (min-width: 459px) {
        :host([mobile-multiline]) .mdc-text-field__input {
          white-space: nowrap;
          max-height: 16px;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-textarea": HaTextArea;
  }
}
