import { preventDefault } from "@fullcalendar/core/internal";
import "@home-assistant/webawesome/dist/components/animation/animation";
import "@home-assistant/webawesome/dist/components/input/input";
import type WaInput from "@home-assistant/webawesome/dist/components/input/input";
import { mdiClose, mdiEye, mdiEyeOff, mdiInformationOutline } from "@mdi/js";
import { LitElement, type PropertyValues, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import "./ha-icon-button";
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
  public value?: string;

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
  public hint? = "";

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
  @property({ type: Boolean, reflect: true })
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
  public validationMessage? = "";

  /** When true, validates the input on blur instead of on form submit. */
  @property({ type: Boolean, attribute: "auto-validate" })
  public autoValidate = false;

  @property({ type: Boolean })
  public invalid = false;

  @state()
  private _invalid = false;

  @query("wa-input")
  private _input?: WaInput;

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

  public checkValidity(): boolean {
    return this._input?.checkValidity() ?? true;
  }

  public reportValidity(): boolean {
    const valid = this.checkValidity();

    this._invalid = !valid;
    return valid;
  }

  protected override updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    const nativeInput = this._input?.input;
    if (!nativeInput) return;

    // wa-input hardcodes aria-describedby="hint" pointing to its internal hint slot wrapper.
    // We remove it and use aria-description instead to properly convey our hint or error text.
    // TODO: fix upstream in wa-input
    nativeInput.removeAttribute("aria-describedby");

    // wa-input doesn't set aria-invalid on its internal <input>, so we do it manually
    // TODO: fix upstream in wa-input
    if (changedProperties.has("invalid") || changedProperties.has("_invalid")) {
      const isInvalid = this.invalid || this._invalid;
      nativeInput.setAttribute("aria-invalid", String(isInvalid));
    }

    // Expose hint or validation error to screen readers on the input itself
    const description =
      this.invalid || this._invalid
        ? this.validationMessage || this._input?.validationMessage
        : this.hint;

    if (description) {
      nativeInput.setAttribute("aria-description", description);
    } else {
      nativeInput.removeAttribute("aria-description");
    }
  }

  protected render() {
    return html`
      <wa-input
        .type=${this.type}
        .value=${this.value ?? null}
        .size=${this.size}
        .appearance=${this.appearance}
        .withClear=${this.withClear}
        .placeholder=${!this.placeholder || this.label || !this.required
          ? this.placeholder
          : this._placeholderWithRequiredMarker(this.placeholder)}
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
        class=${this.invalid || this._invalid ? "invalid" : ""}
        @input=${this._handleInput}
        @change=${this._handleChange}
        @blur=${this._handleBlur}
        @wa-invalid=${this._handleInvalid}
      >
        ${this.label || this.hint
          ? html`
              <div class="label" slot="label">
                ${this.label
                  ? html`<div class="text">
                      <div class="label-content">
                        <span>
                          <slot name="label">${this.label}</slot>
                        </span>
                      </div>
                    </div>`
                  : nothing}
                ${this.hint
                  ? html`<ha-icon-button
                        @click=${preventDefault}
                        .path=${mdiInformationOutline}
                        .label=${"Hint"}
                        hide-title
                        id="hint"
                      ></ha-icon-button>
                      <ha-tooltip for="hint">${this.hint}</ha-tooltip> `
                  : nothing}
              </div>
            `
          : nothing}
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
        <div
          slot="hint"
          class="error ${this.invalid || this._invalid ? "visible" : ""}"
          role="alert"
          aria-live="assertive"
        >
          <span
            >${this.validationMessage || this._input?.validationMessage}</span
          >
        </div>
      </wa-input>
    `;
  }

  private _handleInput() {
    this.value = this._input?.value ?? undefined;
    if (this._invalid && this._input?.checkValidity()) {
      this._invalid = false;
    }
  }

  private _handleChange() {
    this.value = this._input?.value ?? undefined;
  }

  private _handleBlur() {
    if (this.autoValidate) {
      this._invalid = !this._input?.checkValidity();
    }
  }

  private _handleInvalid() {
    this._invalid = true;
  }

  private _placeholderWithRequiredMarker = memoizeOne((placeholder: string) => {
    let marker = getComputedStyle(this).getPropertyValue(
      "--ha-input-required-marker"
    );

    if (!marker) {
      marker = "*";
    }

    if (marker.startsWith('"') && marker.endsWith('"')) {
      marker = marker.slice(1, -1);
    }

    if (!marker) {
      return placeholder;
    }

    return `${placeholder}${marker}`;
  });

  static styles = css`
    :host {
      display: flex;
      align-items: flex-start;
      padding-top: var(--ha-input-padding-top, var(--ha-space-2));
      padding-bottom: var(--ha-input-padding-bottom, var(--ha-space-2));
      text-align: var(--ha-input-text-align, start);
    }
    wa-input {
      flex: 1;
      min-width: 0;
      --wa-transition-fast: 0.15s;
    }

    wa-input:not([disabled])::part(base):hover {
      --wa-form-control-border-color: var(--ha-color-border-neutral-normal);
      background-color: var(--ha-color-fill-neutral-quiet-resting);
    }

    wa-input:not([disabled])::part(base):focus-within {
      outline: none;
      --wa-form-control-border-color: var(--ha-color-border-primary-normal);
      background-color: var(--ha-color-fill-neutral-quiet-resting);
    }

    wa-input.invalid:not([disabled])::part(base):focus-within {
      --wa-form-control-border-color: var(--ha-color-border-danger-normal);
      background-color: var(--ha-color-fill-neutral-quiet-resting);
    }

    wa-input:disabled {
      --wa-form-control-border-color: var(--ha-color-border-disabled);
      background-color: var(--ha-color-fill-disabled);
    }

    wa-input::part(label) {
      margin-block-end: 0;
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

    .label .text {
      height: 100%;
      display: flex;
      flex: 1;
      padding-inline-end: calc(var(--ha-border-radius-xl) / 2);
      max-width: calc(100% - var(--ha-border-radius-xl));
    }

    .label .label-content {
      height: 100%;
      display: flex;
      max-width: 100%;
      align-items: center;
      position: relative;
      --input-label-background: var(--ha-color-fill-neutral-quiet-resting);
      background-color: var(--input-label-background);
      border-top-left-radius: var(--ha-border-radius-xl);
      border-top-right-radius: var(--ha-border-radius-xl);
      transition: background-color 0.15s ease-in-out;
    }

    .label .label-content span {
      padding: 0 var(--ha-space-2);
      min-width: 0;
      overflow-x: clip;
      overflow-y: visible;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    :host([required]) .label .label-content span::after {
      margin-inline-start: 1px;
      content: var(--ha-input-required-marker, "*");
    }

    .label .label-content::before {
      content: "";
      position: absolute;
      inset-inline-start: 0;
      top: 100%;
      background-color: var(--input-label-background);
      transition: background-color 0.15s ease-in-out;
      height: calc(var(--ha-border-radius-xl) / 2 + 4px);
      width: calc(var(--ha-border-radius-xl) / 2 + 4px);
      mask: radial-gradient(
        calc(var(--ha-border-radius-lg) / 2) at 100% 100%,
        transparent 98%,
        black 100%
      );
    }

    :dir(rtl) .label .label-content::before {
      mask: radial-gradient(
        calc(var(--ha-border-radius-lg) / 2) at 0 100%,
        transparent 98%,
        black 100%
      );
    }

    .label .label-content::after {
      content: "";
      position: absolute;
      inset-inline-end: calc(-1 * var(--ha-border-radius-xl) / 2);
      top: var(--ha-border-radius-xl);
      height: calc(var(--ha-border-radius-xl) / 2);
      width: calc(var(--ha-border-radius-xl) / 2);
      background-color: var(--input-label-background);
      transition: background-color 0.15s ease-in-out;
      mask: radial-gradient(
        calc(var(--ha-border-radius-xl) / 2) at 100% 0,
        transparent 98%,
        black 100%
      );
    }

    :dir(rtl) .label .label-content::after {
      mask: radial-gradient(
        calc(var(--ha-border-radius-xl) / 2) at 0 0,
        transparent 98%,
        black 100%
      );
    }

    :host(:focus-within) .label .label-content {
      --input-label-background: var(--ha-color-fill-primary-quiet-hover);
    }

    wa-input.invalid .label .label-content {
      --input-label-background: var(--ha-color-fill-danger-quiet-resting);
    }

    :host(:focus-within) wa-input.invalid .label .label-content {
      --input-label-background: var(--ha-color-fill-danger-quiet-hover);
    }

    .label ha-svg-icon {
      color: var(--ha-color-on-disabled-normal);
      --mdc-icon-size: 16px;
    }

    #hint {
      --ha-icon-button-size: 16px;
      --mdc-icon-size: 16px;
      color: var(--ha-color-on-disabled-normal);
    }

    wa-input::part(hint) {
      margin-block-start: 0;
      color: var(--ha-color-on-danger-quiet);
      font-size: var(--ha-font-size-s);
      margin-inline-start: var(--ha-space-3);
    }

    .error {
      padding-top: var(--ha-space-1);
      transition:
        opacity 0.3s ease-out,
        height 0.3s ease-out;
      height: 0;
      overflow: hidden;
    }

    .error span {
      transition: transform 0.3s ease-out;
      display: inline-block;
      transform: translateY(
        calc(-1 * (var(--ha-font-size-s) + var(--ha-space-1)))
      );
    }

    .error.visible {
      height: calc(var(--ha-font-size-s) + var(--ha-space-2));
    }

    .error.visible span {
      transform: translateY(0);
    }

    wa-input::part(end) {
      color: var(--ha-color-text-secondary);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-input": HaInput;
  }
}
