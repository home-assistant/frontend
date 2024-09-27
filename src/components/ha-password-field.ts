import { mdiEyeOff, mdiEye } from "@mdi/js";
import { LitElement, html, css } from "lit";
import { customElement, eventOptions, property, state } from "lit/decorators";
import "./ha-textfield";
import {
  TextAreaCharCounter,
  TextFieldInputMode,
} from "@material/mwc-textfield/mwc-textfield-base";
import "./ha-icon-button";
import { HomeAssistant } from "../types";

@customElement("ha-password-field")
export class HaPasswordField extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public invalid?: boolean;

  @property({ attribute: "error-message" }) public errorMessage?: string;

  @property({ type: Boolean }) public icon = false;

  @property({ type: Boolean }) public iconTrailing = false;

  @property() public autocomplete?: string;

  @property() public autocorrect?: string;

  @property({ attribute: "input-spellcheck" })
  public inputSpellcheck?: string;

  @property({ type: String }) value = "";

  @property({ type: String }) placeholder = "";

  @property({ type: String }) label = "";

  @property({ type: Boolean, reflect: true }) disabled = false;

  @property({ type: Boolean }) required = false;

  @property({ type: Number }) minLength = -1;

  @property({ type: Number }) maxLength = -1;

  @property({ type: Boolean, reflect: true }) outlined = false;

  @property({ type: String }) helper = "";

  @property({ type: Boolean }) validateOnInitialRender = false;

  @property({ type: String }) validationMessage = "";

  @property({ type: Boolean }) autoValidate = false;

  @property({ type: String }) pattern = "";

  @property({ type: Number }) size: number | null = null;

  @property({ type: Boolean }) helperPersistent = false;

  @property({ type: Boolean }) charCounter: boolean | TextAreaCharCounter =
    false;

  @property({ type: Boolean }) endAligned = false;

  @property({ type: String }) prefix = "";

  @property({ type: String }) suffix = "";

  @property({ type: String }) name = "";

  @property({ type: String, attribute: "input-mode" })
  // lit-analyzer requires specific string types, but TS does not compile since
  // base class is unspecific "string". It also needs non-null coercion (!)
  // since we don't want to provide a default value, but the base class is not
  // typed to allow undefined.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  inputMode?: TextFieldInputMode;

  @property({ type: Boolean }) readOnly = false;

  @property({ type: String }) autocapitalize = "";

  @state() private _unmaskedPassword = false;

  protected render() {
    return html`<ha-textfield
        .invalid=${this.invalid}
        .errorMessage=${this.errorMessage}
        .icon=${this.icon}
        .iconTrailing=${this.iconTrailing}
        .autocomplete=${this.autocomplete}
        .autocorrect=${this.autocorrect}
        .inputSpellcheck=${this.inputSpellcheck}
        .value=${this.value}
        .placeholder=${this.placeholder}
        .label=${this.label}
        .disabled=${this.disabled}
        .required=${this.required}
        .minLength=${this.minLength}
        .maxLength=${this.maxLength}
        .outlined=${this.outlined}
        .helper=${this.helper}
        .validateOnInitialRender=${this.validateOnInitialRender}
        .validationMessage=${this.validationMessage}
        .autoValidate=${this.autoValidate}
        .pattern=${this.pattern}
        .size=${this.size}
        .helperPersistent=${this.helperPersistent}
        .charCounter=${this.charCounter}
        .endAligned=${this.endAligned}
        .prefix=${this.prefix}
        .name=${this.name}
        .inputMode=${this.inputMode}
        .readOnly=${this.readOnly}
        .autocapitalize=${this.autocapitalize}
        .type=${this._unmaskedPassword ? "text" : "password"}
        .suffix=${html`<div style="width: 24px"></div>`}
        @input=${this._handleInputChange}
      ></ha-textfield>
      <ha-icon-button
        toggles
        .label=${this.hass?.localize(
          this._unmaskedPassword
            ? "ui.components.selectors.text.hide_password"
            : "ui.components.selectors.text.show_password"
        ) || (this._unmaskedPassword ? "Hide password" : "Show password")}
        @click=${this._toggleUnmaskedPassword}
        .path=${this._unmaskedPassword ? mdiEyeOff : mdiEye}
      ></ha-icon-button>`;
  }

  private _toggleUnmaskedPassword(): void {
    this._unmaskedPassword = !this._unmaskedPassword;
  }

  @eventOptions({ passive: true })
  private _handleInputChange(ev) {
    this.value = ev.target.value;
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
    }
    ha-textfield {
      width: 100%;
    }
    ha-icon-button {
      position: absolute;
      top: 8px;
      right: 8px;
      inset-inline-start: initial;
      inset-inline-end: 8px;
      --mdc-icon-button-size: 40px;
      --mdc-icon-size: 20px;
      color: var(--secondary-text-color);
      direction: var(--direction);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-password-field": HaPasswordField;
  }
}
