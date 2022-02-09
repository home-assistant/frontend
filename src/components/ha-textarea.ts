import { TextAreaBase } from "@material/mwc-textarea/mwc-textarea-base";
import { styles as textfieldStyles } from "@material/mwc-textfield/mwc-textfield.css";
import { styles as textareaStyles } from "@material/mwc-textarea/mwc-textarea.css";
import { css, PropertyValues } from "lit";
import { customElement, eventOptions, property } from "lit/decorators";

@customElement("ha-textarea")
export class HaTextArea extends TextAreaBase {
  @property({ type: Boolean, reflect: true }) autogrow = false;

  updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (this.autogrow && changedProperties.has("value")) {
      this.mdcRoot.dataset.value = this.value;
    }
  }

  @eventOptions({ passive: true })
  protected handleInputChange() {
    super.handleInputChange();
    if (this.autogrow) {
      this.mdcRoot.dataset.value = this.value;
    }
  }

  static override styles = [
    textfieldStyles,
    textareaStyles,
    css`
      :host([autogrow]) {
        max-height: 200px;
      }
      :host([autogrow]) .mdc-text-field {
        min-height: 74px;
      }
      :host([autogrow]) .mdc-text-field:after {
        content: attr(data-value);
        margin-top: 23px;
        margin-bottom: 9px;
        line-height: 1.5rem;
        padding: 0px 16px 0px 16px;
        letter-spacing: var(
          --mdc-typography-subtitle1-letter-spacing,
          0.009375em
        );
        visibility: hidden;
        white-space: pre-wrap;
      }
      :host([autogrow]) .mdc-text-field__input {
        position: absolute;
        top: 0;
        bottom: 0;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-textarea": HaTextArea;
  }
}
