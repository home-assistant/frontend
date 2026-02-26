import "@home-assistant/webawesome/dist/components/input/input";
import type WaInput from "@home-assistant/webawesome/dist/components/input/input";
import { mdiClose, mdiEye, mdiEyeOff, mdiInformationOutline } from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { withViewTransition } from "../common/util/view-transition";
import "./ha-svg-icon";
import "./ha-tooltip";

@customElement("ha-input")
export class HaInput extends LitElement {
  /** The type of input. */
  @property()
  public type:
    | "date"
    | "datetime-local"
    | "email"
    | "number"
    | "password"
    | "search"
    | "tel"
    | "text"
    | "time"
    | "url" = "text";

  /** The current value of the input. */
  @property()
  public value: string | null = null;

  /** The input's size. */
  @property()
  public size: "small" | "medium" | "large" = "medium";

  /** The input's visual appearance. */
  @property()
  public appearance: "filled" | "outlined" | "filled-outlined" = "outlined";

  /** Draws a pill-style input with rounded edges. */
  @property({ type: Boolean })
  public pill = false;

  /** The input's label. */
  @property()
  public label = "";

  /** The input's hint. */
  @property()
  public hint = "";

  /** Adds a clear button when the input is not empty. */
  @property({ type: Boolean, attribute: "with-clear" })
  public withClear = false;

  /** Placeholder text to show as a hint when the input is empty. */
  @property()
  public placeholder = "";

  /** Makes the input readonly. */
  @property({ type: Boolean })
  public readonly = false;

  /** Adds a button to toggle the password's visibility. */
  @property({ type: Boolean, attribute: "password-toggle" })
  public passwordToggle = false;

  /** Determines whether or not the password is currently visible. */
  @property({ type: Boolean, attribute: "password-visible" })
  public passwordVisible = false;

  /** Hides the browser's built-in increment/decrement spin buttons for number inputs. */
  @property({ type: Boolean, attribute: "without-spin-buttons" })
  public withoutSpinButtons = false;

  /** Makes the input a required field. */
  @property({ type: Boolean })
  public required = false;

  /** A regular expression pattern to validate input against. */
  @property()
  public pattern?: string;

  /** The minimum length of input that will be considered valid. */
  @property({ type: Number })
  public minlength?: number;

  /** The maximum length of input that will be considered valid. */
  @property({ type: Number })
  public maxlength?: number;

  /** The input's minimum value. Only applies to date and number input types. */
  @property()
  public min?: number | string;

  /** The input's maximum value. Only applies to date and number input types. */
  @property()
  public max?: number | string;

  /** Specifies the granularity that the value must adhere to. */
  @property()
  public step?: number | "any";

  /** Controls whether and how text input is automatically capitalized. */
  @property()
  // eslint-disable-next-line lit/no-native-attributes
  public autocapitalize:
    | "off"
    | "none"
    | "on"
    | "sentences"
    | "words"
    | "characters"
    | "" = "";

  /** Indicates whether the browser's autocorrect feature is on or off. */
  @property({ type: Boolean })
  public autocorrect = false;

  /** Specifies what permission the browser has to provide assistance in filling out form field values. */
  @property()
  public autocomplete?: string;

  /** Indicates that the input should receive focus on page load. */
  @property({ type: Boolean })
  // eslint-disable-next-line lit/no-native-attributes
  public autofocus = false;

  /** Used to customize the label or icon of the Enter key on virtual keyboards. */
  @property()
  // eslint-disable-next-line lit/no-native-attributes
  public enterkeyhint:
    | "enter"
    | "done"
    | "go"
    | "next"
    | "previous"
    | "search"
    | "send"
    | "" = "";

  /** Enables spell checking on the input. */
  @property({ type: Boolean })
  // eslint-disable-next-line lit/no-native-attributes
  public spellcheck = true;

  /** Tells the browser what type of data will be entered by the user. */
  @property()
  // eslint-disable-next-line lit/no-native-attributes
  public inputmode:
    | "none"
    | "text"
    | "decimal"
    | "numeric"
    | "tel"
    | "search"
    | "email"
    | "url"
    | "" = "";

  /** The name of the input, submitted as a name/value pair with form data. */
  @property()
  public name?: string;

  /** Disables the form control. */
  @property({ type: Boolean })
  public disabled = false;

  /** Custom validation message to show when the input is invalid. */
  @property({ attribute: "validation-message" })
  public validationMessage = "";

  /** When true, validates the input on blur instead of on form submit. */
  @property({ type: Boolean, attribute: "auto-validate" })
  public autoValidate = false;

  @state()
  private _invalid = false;

  @query("wa-input")
  private _input!: WaInput;

  static shadowRootOptions: ShadowRootInit = {
    mode: "open",
    delegatesFocus: true,
  };

  /** Selects all the text in the input. */
  public select(): void {
    this._input?.select();
  }

  /** Sets the start and end positions of the text selection (0-based). */
  public setSelectionRange(
    selectionStart: number,
    selectionEnd: number,
    selectionDirection?: "forward" | "backward" | "none"
  ): void {
    this._input?.setSelectionRange(
      selectionStart,
      selectionEnd,
      selectionDirection
    );
  }

  /** Replaces a range of text with a new string. */
  public setRangeText(
    replacement: string,
    start?: number,
    end?: number,
    selectMode?: "select" | "start" | "end" | "preserve"
  ): void {
    this._input?.setRangeText(replacement, start, end, selectMode);
  }

  /** Displays the browser picker for an input element. */
  public showPicker(): void {
    this._input?.showPicker();
  }

  /** Increments the value of a numeric input type by the value of the step attribute. */
  public stepUp(): void {
    this._input?.stepUp();
  }

  /** Decrements the value of a numeric input type by the value of the step attribute. */
  public stepDown(): void {
    this._input?.stepDown();
  }

  protected render() {
    return html`
      <wa-input
        .type=${this.type}
        .value=${this.value}
        .size=${this.size}
        .appearance=${this.appearance}
        .hint=${this._invalid ? this.validationMessage : ""}
        .withClear=${this.withClear}
        .placeholder=${this.placeholder}
        .readonly=${this.readonly}
        .passwordToggle=${this.passwordToggle}
        .passwordVisible=${this.passwordVisible}
        .withoutSpinButtons=${this.withoutSpinButtons}
        .required=${this.required}
        .pattern=${this.pattern}
        .minlength=${this.minlength}
        .maxlength=${this.maxlength}
        .min=${this.min}
        .max=${this.max}
        .step=${this.step}
        .autocapitalize=${this.autocapitalize || undefined}
        .autocorrect=${this.autocorrect ? "on" : "off"}
        .autocomplete=${this.autocomplete}
        .autofocus=${this.autofocus}
        .enterkeyhint=${this.enterkeyhint || undefined}
        .spellcheck=${this.spellcheck}
        .inputmode=${this.inputmode || undefined}
        .name=${this.name}
        .disabled=${this.disabled}
        class=${this._invalid ? "invalid" : ""}
        @input=${this._handleInput}
        @change=${this._handleChange}
        @blur=${this._handleBlur}
      >
        <div class="label" slot="label">
          <span>
            <slot name="label">${this.label}</slot>
          </span>
          ${this.hint
            ? html`<ha-svg-icon
                  .path=${mdiInformationOutline}
                  id="hint"
                ></ha-svg-icon>
                <ha-tooltip for="hint">${this.hint}</ha-tooltip> `
            : nothing}
        </div>
        <slot name="start" slot="start"></slot>
        <slot name="end" slot="end"></slot>
        <slot name="clear-icon" slot="clear-icon">
          <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
        </slot>
        <slot name="show-password-icon" slot="show-password-icon">
          <ha-svg-icon .path=${mdiEye}></ha-svg-icon>
        </slot>
        <slot name="hide-password-icon" slot="hide-password-icon">
          <ha-svg-icon .path=${mdiEyeOff}></ha-svg-icon>
        </slot>
      </wa-input>
    `;
  }

  private _handleInput() {
    this.value = this._input?.value ?? null;
    if (this._invalid) {
      this._invalid = false;
    }
  }

  private _handleChange() {
    this.value = this._input?.value ?? null;
  }

  private _handleBlur() {
    if (this.autoValidate) {
      withViewTransition(() => {
        this._invalid = !this._input.checkValidity();
      });
    }
  }

  static styles = css`
    :host {
      display: flex;
      align-items: flex-start;
    }
    wa-input {
      flex: 1;
      min-width: 0;
    }

    wa-input::part(base):focus-within {
      outline: none;
      --wa-form-control-border-color: var(--ha-color-border-primary-normal);
    }

    wa-input.invalid {
      --wa-form-control-border-color: var(--ha-color-border-danger-normal);
    }

    wa-input::part(label) {
      margin-block-end: 2px;
    }

    .label {
      height: 24px;
      display: flex;
      width: 100%;
      align-items: center;
      color: var(--ha-color-text-secondary);
      font-size: var(--ha-font-size-s);
      font-weight: var(--ha-font-weight-medium);
      gap: var(--ha-space-1);
    }

    .label span {
      line-height: 1;
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .label ha-svg-icon {
      color: var(--ha-color-on-disabled-normal);
      --mdc-icon-size: 16px;
    }

    wa-input.invalid::part(hint) {
      margin-block-start: var(--ha-space-1);
      color: var(--ha-color-on-danger-quiet);
      font-size: var(--ha-font-size-s);
      margin-inline-start: var(--ha-space-3);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-input": HaInput;
  }
}
