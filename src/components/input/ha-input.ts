import "@home-assistant/webawesome/dist/components/animation/animation";
import "@home-assistant/webawesome/dist/components/input/input";
import type WaInput from "@home-assistant/webawesome/dist/components/input/input";
import { HasSlotController } from "@home-assistant/webawesome/dist/internal/slot";
import { mdiClose, mdiEye, mdiEyeOff } from "@mdi/js";
import { LitElement, type PropertyValues, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import { stopPropagation } from "../../common/dom/stop_propagation";
import "../ha-icon-button";
import "../ha-tooltip";

export type InputType =
  | "date"
  | "datetime-local"
  | "email"
  | "number"
  | "password"
  | "search"
  | "tel"
  | "text"
  | "time"
  | "color"
  | "url";

@customElement("ha-input")
export class HaInput extends LitElement {
  @property({ reflect: true })
  public type: InputType = "text";

  @property()
  public value?: string;

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

  @property({ type: Boolean, attribute: "inset-label" })
  public insetLabel = false;

  @state()
  private _invalid = false;

  @query("wa-input")
  private _input?: WaInput;

  private readonly _hasSlotController = new HasSlotController(
    this,
    "label",
    "hint",
    "input"
  );

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

  protected override async firstUpdated(
    changedProperties: PropertyValues
  ): Promise<void> {
    super.firstUpdated(changedProperties);

    if (!this.insetLabel) {
      // Wait for wa-input to finish its first render
      await this._input?.updateComplete;
      this._syncStartSlotWidth();
    }
  }

  protected render() {
    const hasLabelSlot = this.label
      ? false
      : this._hasSlotController.test("label");

    const hasHintSlot = this.hint
      ? false
      : this._hasSlotController.test("hint");

    return html`
      <wa-input
        .type=${this.type}
        .value=${this.value ?? null}
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
        class=${classMap({
          invalid: this.invalid || this._invalid,
          "label-raised":
            (this.value !== undefined && this.value !== "") ||
            (this.label && this.placeholder),
          "no-label": !this.label,
          "hint-hidden":
            !this.hint &&
            !hasHintSlot &&
            !this.required &&
            !this._invalid &&
            !this.invalid,
        })}
        @input=${this._handleInput}
        @change=${this._handleChange}
        @blur=${this._handleBlur}
        @wa-invalid=${this._handleInvalid}
        exportparts="base:wa-base, hint:wa-hint, input:wa-input"
      >
        ${this.label || hasLabelSlot
          ? html`<slot name="label" slot="label"
              >${this._renderLabel(this.label, this.required)}</slot
            >`
          : nothing}
        <slot
          name="start"
          slot="start"
          @slotchange=${this._syncStartSlotWidth}
        ></slot>
        <slot name="end" slot="end"></slot>
        <slot name="clear-icon" slot="clear-icon">
          <ha-icon-button .path=${mdiClose}></ha-icon-button>
        </slot>
        <slot name="show-password-icon" slot="show-password-icon">
          <ha-icon-button
            @keydown=${stopPropagation}
            .path=${mdiEye}
          ></ha-icon-button>
        </slot>
        <slot name="hide-password-icon" slot="hide-password-icon">
          <ha-icon-button
            @keydown=${stopPropagation}
            .path=${mdiEyeOff}
          ></ha-icon-button>
        </slot>
        <div
          slot="hint"
          class=${classMap({
            error: this.invalid || this._invalid,
          })}
          role=${ifDefined(this.invalid || this._invalid ? "alert" : undefined)}
          aria-live="polite"
        >
          ${this._invalid || this.invalid
            ? this.validationMessage || this._input?.validationMessage
            : this.hint ||
              (hasHintSlot ? html`<slot name="hint"></slot>` : nothing)}
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

  private _syncStartSlotWidth = () => {
    const startEl = this._input?.shadowRoot?.querySelector(
      '[part~="start"]'
    ) as HTMLElement | null;
    const startWidth = startEl?.offsetWidth ?? 0;
    if (startWidth > 0 && !this.insetLabel) {
      this.style.setProperty(
        "--start-slot-width",
        `calc(${startWidth}px + var(--ha-space-1))`
      );
      this.style.setProperty(
        "--input-padding-inline-start",
        `var(--ha-space-1)`
      );
    } else {
      this.style.removeProperty("--start-slot-width");
      this.style.removeProperty("--input-padding-inline-start");
    }
  };

  private _renderLabel = memoizeOne((label: string, required: boolean) => {
    if (!required) {
      return label;
    }

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
      return label;
    }

    return `${label}${marker}`;
  });

  static styles = css`
    :host {
      display: flex;
      align-items: flex-start;
      padding-top: var(--ha-input-padding-top);
      padding-bottom: var(--ha-input-padding-bottom, var(--ha-space-2));
      text-align: var(--ha-input-text-align, start);
    }
    wa-input {
      flex: 1;
      min-width: 0;
      --wa-transition-fast: var(--wa-transition-normal);
      position: relative;
    }

    wa-input::part(label) {
      position: absolute;
      top: 0;
      font-weight: var(--ha-font-weight-normal);
      font-family: var(--ha-font-family-body);
      transition: all var(--wa-transition-normal) ease-in-out;
      color: var(--secondary-text-color);
      line-height: var(--ha-line-height-condensed);
      z-index: 1;
      pointer-events: none;
      padding-inline-start: calc(
        var(--start-slot-width, 0px) + var(--ha-space-4)
      );
      padding-inline-end: var(--ha-space-4);
      padding-top: var(--ha-space-5);
      font-size: var(--ha-font-size-m);
    }

    :host(:focus-within) wa-input::part(label) {
      color: var(--primary-color);
    }

    :host(:focus-within) wa-input.invalid::part(label),
    wa-input.invalid:not([disabled])::part(label) {
      color: var(--ha-color-fill-danger-loud-resting);
    }

    wa-input.label-raised::part(label),
    :host(:focus-within) wa-input::part(label) {
      padding-top: var(--ha-space-3);
      font-size: var(--ha-font-size-xs);
    }

    wa-input::part(base) {
      height: 56px;
      background-color: var(--ha-color-form-background);
      border-top-left-radius: var(--ha-border-radius-sm);
      border-top-right-radius: var(--ha-border-radius-sm);
      border-bottom-left-radius: var(--ha-border-radius-square);
      border-bottom-right-radius: var(--ha-border-radius-square);
      border: none;
      padding: 0 var(--ha-space-4);
      position: relative;
      transition: background-color var(--wa-transition-normal) ease-in-out;
    }

    wa-input::part(base)::after {
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

    :host(:focus-within) wa-input::part(base)::after {
      height: 2px;
      background-color: var(--primary-color);
    }

    :host(:focus-within) wa-input.invalid::part(base)::after,
    wa-input.invalid:not([disabled])::part(base)::after {
      background-color: var(--ha-color-border-danger-normal);
    }

    wa-input::part(input) {
      padding-top: var(--ha-space-3);
      padding-inline-start: var(--input-padding-inline-start, 0);
    }
    wa-input.no-label::part(input) {
      padding-top: 0;
    }
    :host([type="color"]) wa-input::part(input) {
      padding-top: var(--ha-space-6);
      cursor: pointer;
    }
    :host([type="color"]) wa-input.no-label::part(input) {
      padding: var(--ha-space-2);
    }
    :host([type="color"]) wa-input.no-label::part(base) {
      padding: 0;
    }
    wa-input::part(input)::placeholder {
      color: var(--ha-color-neutral-60);
    }

    :host(:focus-within) wa-input::part(base) {
      outline: none;
    }

    wa-input::part(base):hover {
      background-color: var(--ha-color-form-background-hover);
    }

    wa-input:disabled::part(base) {
      background-color: var(--ha-color-form-background-disabled);
    }

    wa-input::part(hint) {
      height: var(--ha-space-5);
      margin-block-start: 0;
      margin-inline-start: var(--ha-space-3);
      font-size: var(--ha-font-size-xs);
      display: flex;
      align-items: center;
      color: var(--ha-color-text-secondary);
    }

    wa-input.hint-hidden::part(hint) {
      height: 0;
    }

    .error {
      color: var(--ha-color-on-danger-quiet);
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
