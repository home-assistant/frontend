import "@home-assistant/webawesome/dist/components/animation/animation";
import "@home-assistant/webawesome/dist/components/input/input";
import type WaInput from "@home-assistant/webawesome/dist/components/input/input";
import { HasSlotController } from "@home-assistant/webawesome/dist/internal/slot";
import { mdiClose, mdiEye, mdiEyeOff } from "@mdi/js";
import {
  LitElement,
  type PropertyValues,
  type TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, query } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { stopPropagation } from "../../common/dom/stop_propagation";
import "../ha-icon-button";
import "../ha-svg-icon";
import "../ha-tooltip";
import { WaInputMixin, waInputStyles } from "./wa-input-mixin";

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

/**
 * Home Assistant input component
 *
 * @element ha-input
 * @extends {LitElement}
 *
 * @summary
 * A text input component supporting Home Assistant theming and validation, based on webawesome input.
 * Supports multiple input types including text, number, password, email, search, and more.
 *
 * @slot start - Content placed before the input (usually for icons or prefixes).
 * @slot end - Content placed after the input (usually for icons or suffixes).
 * @slot label - Custom label content. Overrides the `label` property.
 * @slot hint - Custom hint content. Overrides the `hint` property.
 * @slot clear-icon - Custom clear icon. Defaults to a close icon button.
 * @slot show-password-icon - Custom show password icon. Defaults to an eye icon button.
 * @slot hide-password-icon - Custom hide password icon. Defaults to an eye-off icon button.
 *
 * @csspart wa-base - The underlying wa-input base wrapper.
 * @csspart wa-hint - The underlying wa-input hint container.
 * @csspart wa-input - The underlying wa-input input element.
 *
 * @cssprop --ha-input-padding-top - Padding above the input.
 * @cssprop --ha-input-padding-bottom - Padding below the input. Defaults to `var(--ha-space-2)`.
 * @cssprop --ha-input-text-align - Text alignment of the input. Defaults to `start`.
 * @cssprop --ha-input-required-marker - The marker shown after the label for required fields. Defaults to `"*"`.
 *
 * @attr {("material"|"outlined")} appearance - Sets the input appearance style. "material" is the default filled style, "outlined" uses a bordered style.
 * @attr {("date"|"datetime-local"|"email"|"number"|"password"|"search"|"tel"|"text"|"time"|"color"|"url")} type - Sets the input type.
 * @attr {string} label - The input's label text.
 * @attr {string} hint - The input's hint/helper text.
 * @attr {string} placeholder - Placeholder text shown when the input is empty.
 * @attr {boolean} with-clear - Adds a clear button when the input is not empty.
 * @attr {boolean} readonly - Makes the input readonly.
 * @attr {boolean} disabled - Disables the input and prevents user interaction.
 * @attr {boolean} required - Makes the input a required field.
 * @attr {boolean} password-toggle - Adds a button to toggle the password visibility.
 * @attr {boolean} without-spin-buttons - Hides the browser's built-in spin buttons for number inputs.
 * @attr {boolean} auto-validate - Validates the input on blur instead of on form submit.
 * @attr {boolean} invalid - Marks the input as invalid.
 * @attr {boolean} inset-label - Uses an inset label style where the label stays inside the input.
 * @attr {string} validation-message - Custom validation message shown when the input is invalid.
 */
@customElement("ha-input")
export class HaInput extends WaInputMixin(LitElement) {
  @property({ reflect: true }) appearance: "material" | "outlined" = "material";

  @property({ reflect: true })
  public type: InputType = "text";

  /** Adds a clear button when the input is not empty. */
  @property({ type: Boolean, attribute: "with-clear" })
  public withClear = false;

  /** Adds a button to toggle the password's visibility. */
  @property({ type: Boolean, attribute: "password-toggle" })
  public passwordToggle = false;

  /** Determines whether or not the password is currently visible. */
  @property({ type: Boolean, attribute: "password-visible" })
  public passwordVisible = false;

  /** Hides the browser's built-in increment/decrement spin buttons for number inputs. */
  @property({ type: Boolean, attribute: "without-spin-buttons" })
  public withoutSpinButtons = false;

  /** A regular expression pattern to validate input against. */
  @property()
  public pattern?: string;

  /** The input's minimum value. Only applies to date and number input types. */
  @property()
  public min?: number | string;

  /** The input's maximum value. Only applies to date and number input types. */
  @property()
  public max?: number | string;

  /** Specifies the granularity that the value must adhere to. */
  @property()
  public step?: number | "any";

  /** Indicates whether the browser's autocorrect feature is on or off. */
  @property({ type: Boolean })
  public autocorrect = false;

  @property({ type: Boolean, attribute: "inset-label" })
  public insetLabel = false;

  @query("wa-input")
  private _input?: WaInput;

  private readonly _hasSlotController = new HasSlotController(
    this,
    "label",
    "hint",
    "input",
    "start"
  );

  protected get _formControl(): WaInput | undefined {
    return this._input;
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

    const hasStartSlot = this._hasSlotController.test("start");

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
          input: true,
          invalid: this.invalid || this._invalid,
          "label-raised":
            (this.value !== undefined && this.value !== "") ||
            (this.label && this.placeholder) ||
            (hasStartSlot && this.insetLabel),
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
              >${this.label
                ? this._renderLabel(this.label, this.required)
                : nothing}</slot
            >`
          : nothing}
        <slot name="start" slot="start" @slotchange=${this._syncStartSlotWidth}>
          ${this.renderStartDefault()}
        </slot>
        <slot name="end" slot="end"> ${this.renderEndDefault()} </slot>
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

  protected renderStartDefault(): TemplateResult | typeof nothing {
    return nothing;
  }

  protected renderEndDefault(): TemplateResult | typeof nothing {
    return nothing;
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

  static styles = [
    waInputStyles,
    css`
      :host {
        display: flex;
        align-items: flex-start;
        padding-top: var(--ha-input-padding-top);
        padding-bottom: var(--ha-input-padding-bottom, var(--ha-space-2));
        text-align: var(--ha-input-text-align, start);
      }
      :host([appearance="outlined"]) {
        padding-bottom: var(--ha-input-padding-bottom);
      }

      wa-input::part(label) {
        padding-inline-start: calc(
          var(--start-slot-width, 0px) + var(--ha-space-4)
        );
        padding-inline-end: var(--ha-space-4);
        padding-top: var(--ha-space-5);
      }

      :host([appearance="material"]:focus-within) wa-input::part(label) {
        color: var(--primary-color);
      }

      wa-input.label-raised::part(label),
      :host(:focus-within) wa-input::part(label),
      :host([type="date"]) wa-input::part(label) {
        padding-top: var(--ha-space-3);
        font-size: var(--ha-font-size-xs);
      }

      wa-input::part(base) {
        height: 56px;
        padding: 0 var(--ha-space-4);
      }

      :host([appearance="outlined"]) wa-input.no-label::part(base) {
        height: 32px;
        padding: 0 var(--ha-space-2);
      }

      :host([appearance="outlined"]) wa-input::part(base) {
        border: 1px solid var(--ha-color-border-neutral-quiet);
        background-color: var(--card-background-color);
        border-radius: var(--ha-border-radius-md);
        transition: border-color var(--wa-transition-normal) ease-in-out;
      }

      :host([appearance="material"]) ::part(base)::after {
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

      :host([appearance="material"]:focus-within) wa-input::part(base)::after {
        height: 2px;
        background-color: var(--primary-color);
      }

      :host([appearance="material"]:focus-within)
        wa-input.invalid::part(base)::after,
      :host([appearance="material"])
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

      wa-input::part(base):hover {
        background-color: var(--ha-color-form-background-hover);
      }

      :host([appearance="outlined"]) wa-input::part(base):hover {
        border-color: var(--ha-color-border-neutral-normal);
      }
      :host([appearance="outlined"]:focus-within) wa-input::part(base) {
        border-color: var(--primary-color);
      }

      wa-input:disabled::part(base) {
        background-color: var(--ha-color-form-background-disabled);
      }

      wa-input::part(end) {
        color: var(--ha-color-text-secondary);
      }

      :host([appearance="material"]:focus-within)
        wa-input.invalid::part(base)::after,
      :host([appearance="material"])
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
        padding-bottom: 2px;
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

      :host([appearance="outlined"]) wa-input::part(base):hover {
        border-color: var(--ha-color-border-neutral-normal);
      }
      :host([appearance="outlined"]:focus-within) wa-input::part(base) {
        border-color: var(--primary-color);
      }

      wa-input:disabled::part(base) {
        background-color: var(--ha-color-form-background-disabled);
      }

      wa-input:disabled::part(label) {
        opacity: 0.5;
      }

      wa-input::part(hint) {
        min-height: var(--ha-space-5);
        margin-block-start: 0;
        margin-inline-start: var(--ha-space-3);
        font-size: var(--ha-font-size-xs);
        display: flex;
        align-items: center;
        color: var(--ha-color-text-secondary);
      }

      wa-input.hint-hidden::part(hint) {
        height: 0;
        min-height: 0;
      }

      .error {
        color: var(--ha-color-on-danger-quiet);
      }

      wa-input::part(end) {
        color: var(--ha-color-text-secondary);
      }

      :host([appearance="outlined"]) wa-input.no-label {
        --ha-icon-button-size: 24px;
        --mdc-icon-size: 18px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-input": HaInput;
  }
}
