import { TextFieldBase } from "@material/mwc-textfield/mwc-textfield-base";
import { styles } from "@material/mwc-textfield/mwc-textfield.css";
import { TemplateResult, html, PropertyValues, css } from "lit";
import { customElement, property, query } from "lit/decorators";

@customElement("ha-textfield")
export class HaTextField extends TextFieldBase {
  @property({ type: Boolean }) public invalid?: boolean;

  @property({ attribute: "error-message" }) public errorMessage?: string;

  // @ts-ignore
  @property({ type: Boolean }) public icon?: boolean;

  // @ts-ignore
  @property({ type: Boolean }) public iconTrailing?: boolean;

  @property() public autocomplete?: string;

  @property() public autocorrect?: string;

  @property({ attribute: "input-spellcheck" })
  public inputSpellcheck?: string;

  @query("input") public formElement!: HTMLInputElement;

  override updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (
      (changedProperties.has("invalid") &&
        (this.invalid || changedProperties.get("invalid") !== undefined)) ||
      changedProperties.has("errorMessage")
    ) {
      this.setCustomValidity(
        this.invalid ? this.errorMessage || "Invalid" : ""
      );
      this.reportValidity();
    }
    if (changedProperties.has("autocomplete")) {
      if (this.autocomplete) {
        this.formElement.setAttribute("autocomplete", this.autocomplete);
      } else {
        this.formElement.removeAttribute("autocomplete");
      }
    }
    if (changedProperties.has("autocorrect")) {
      if (this.autocorrect) {
        this.formElement.setAttribute("autocorrect", this.autocorrect);
      } else {
        this.formElement.removeAttribute("autocorrect");
      }
    }
    if (changedProperties.has("inputSpellcheck")) {
      if (this.inputSpellcheck) {
        this.formElement.setAttribute("spellcheck", this.inputSpellcheck);
      } else {
        this.formElement.removeAttribute("spellcheck");
      }
    }
  }

  protected override renderIcon(
    _icon: string,
    isTrailingIcon = false
  ): TemplateResult {
    const type = isTrailingIcon ? "trailing" : "leading";

    return html`
      <span
        class="mdc-text-field__icon mdc-text-field__icon--${type}"
        tabindex=${isTrailingIcon ? 1 : -1}
      >
        <slot name="${type}Icon"></slot>
      </span>
    `;
  }

  static override styles = [
    styles,
    css`
      .mdc-text-field__input {
        width: var(--ha-textfield-input-width, 100%);
      }
      .mdc-text-field:not(.mdc-text-field--with-leading-icon) {
        padding: var(--text-field-padding, 0px 16px);
      }
      .mdc-text-field__affix--suffix {
        padding-left: var(--text-field-suffix-padding-left, 12px);
        padding-right: var(--text-field-suffix-padding-right, 0px);
        padding-inline-start: var(--text-field-suffix-padding-left, 12px);
        padding-inline-end: var(--text-field-suffix-padding-right, 0px);
        direction: var(--direction);
      }
      .mdc-text-field--with-leading-icon {
        padding-inline-start: var(--text-field-suffix-padding-left, 0px);
        padding-inline-end: var(--text-field-suffix-padding-right, 16px);
        direction: var(--direction);
      }

      .mdc-text-field--with-leading-icon.mdc-text-field--with-trailing-icon {
        padding-left: var(--text-field-suffix-padding-left, 0px);
        padding-right: var(--text-field-suffix-padding-right, 0px);
        padding-inline-start: var(--text-field-suffix-padding-left, 0px);
        padding-inline-end: var(--text-field-suffix-padding-right, 0px);
      }
      .mdc-text-field:not(.mdc-text-field--disabled)
        .mdc-text-field__affix--suffix {
        color: var(--secondary-text-color);
      }

      .mdc-text-field__icon {
        color: var(--secondary-text-color);
      }

      .mdc-text-field__icon--leading {
        margin-inline-start: 16px;
        margin-inline-end: 8px;
        direction: var(--direction);
      }

      .mdc-text-field__icon--trailing {
        padding: var(--textfield-icon-trailing-padding, 12px);
      }

      .mdc-floating-label:not(.mdc-floating-label--float-above) {
        text-overflow: ellipsis;
        width: inherit;
        padding-right: 30px;
        padding-inline-end: 30px;
        padding-inline-start: initial;
        box-sizing: border-box;
        direction: var(--direction);
      }

      input {
        text-align: var(--text-field-text-align, start);
      }

      /* Edge, hide reveal password icon */
      ::-ms-reveal {
        display: none;
      }

      /* Chrome, Safari, Edge, Opera */
      :host([no-spinner]) input::-webkit-outer-spin-button,
      :host([no-spinner]) input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      /* Firefox */
      :host([no-spinner]) input[type="number"] {
        -moz-appearance: textfield;
      }

      .mdc-text-field__ripple {
        overflow: hidden;
      }

      .mdc-text-field {
        overflow: var(--text-field-overflow);
      }

      .mdc-floating-label {
        inset-inline-start: 16px !important;
        inset-inline-end: initial !important;
        transform-origin: var(--float-start);
        direction: var(--direction);
        text-align: var(--float-start);
      }

      .mdc-text-field--with-leading-icon.mdc-text-field--filled
        .mdc-floating-label {
        max-width: calc(
          100% - 48px - var(--text-field-suffix-padding-left, 0px)
        );
        inset-inline-start: calc(
          48px + var(--text-field-suffix-padding-left, 0px)
        ) !important;
        inset-inline-end: initial !important;
        direction: var(--direction);
      }

      .mdc-text-field__input[type="number"] {
        direction: var(--direction);
      }
      .mdc-text-field__affix--prefix {
        padding-right: var(--text-field-prefix-padding-right, 2px);
      }

      .mdc-text-field:not(.mdc-text-field--disabled)
        .mdc-text-field__affix--prefix {
        color: var(--mdc-text-field-label-ink-color);
      }
    `,
    // safari workaround - must be explicit
    document.dir === "rtl"
      ? css`
          .mdc-text-field__affix--suffix,
          .mdc-text-field--with-leading-icon,
          .mdc-text-field__icon--leading,
          .mdc-floating-label,
          .mdc-text-field--with-leading-icon.mdc-text-field--filled
            .mdc-floating-label,
          .mdc-text-field__input[type="number"] {
            direction: rtl;
          }
        `
      : css``,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-textfield": HaTextField;
  }
}
