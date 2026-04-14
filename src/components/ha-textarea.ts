import "@home-assistant/webawesome/dist/components/textarea/textarea";
import type WaTextarea from "@home-assistant/webawesome/dist/components/textarea/textarea";
import { HasSlotController } from "@home-assistant/webawesome/dist/internal/slot";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { WaInputMixin, waInputStyles } from "./input/wa-input-mixin";

/**
 * Home Assistant textarea component
 *
 * @element ha-textarea
 * @extends {LitElement}
 *
 * @summary
 * A multi-line text input component supporting Home Assistant theming and validation, based on webawesome textarea.
 *
 * @slot label - Custom label content. Overrides the `label` property.
 * @slot hint - Custom hint content. Overrides the `hint` property.
 *
 * @csspart wa-base - The underlying wa-textarea base wrapper.
 * @csspart wa-hint - The underlying wa-textarea hint container.
 * @csspart wa-textarea - The underlying wa-textarea textarea element.
 *
 * @cssprop --ha-textarea-padding-bottom - Padding below the textarea host.
 * @cssprop --ha-textarea-max-height - Maximum height of the textarea when using `resize="auto"`. Defaults to `200px`.
 * @cssprop --ha-textarea-required-marker - The marker shown after the label for required fields. Defaults to `"*"`.
 *
 * @attr {string} label - The textarea's label text.
 * @attr {string} hint - The textarea's hint/helper text.
 * @attr {string} placeholder - Placeholder text shown when the textarea is empty.
 * @attr {boolean} readonly - Makes the textarea readonly.
 * @attr {boolean} disabled - Disables the textarea and prevents user interaction.
 * @attr {boolean} required - Makes the textarea a required field.
 * @attr {number} rows - Number of visible text rows.
 * @attr {number} minlength - Minimum number of characters required.
 * @attr {number} maxlength - Maximum number of characters allowed.
 * @attr {("none"|"vertical"|"horizontal"|"both"|"auto")} resize - Controls the textarea's resize behavior. Defaults to `"none"`.
 * @attr {boolean} auto-validate - Validates the textarea on blur instead of on form submit.
 * @attr {boolean} invalid - Marks the textarea as invalid.
 * @attr {string} validation-message - Custom validation message shown when the textarea is invalid.
 */
@customElement("ha-textarea")
export class HaTextArea extends WaInputMixin(LitElement) {
  @property({ type: Number })
  public rows?: number;

  @property()
  public resize: "none" | "vertical" | "horizontal" | "both" | "auto" = "none";

  @query("wa-textarea")
  private _textarea?: WaTextarea;

  private readonly _hasSlotController = new HasSlotController(
    this,
    "label",
    "hint"
  );

  protected get _formControl(): WaTextarea | undefined {
    return this._textarea;
  }

  protected readonly _requiredMarkerCSSVar = "--ha-textarea-required-marker";

  /** Programmatically toggle focus styling (used by ha-date-range-picker). */
  public setFocused(focused: boolean): void {
    if (focused) {
      this.toggleAttribute("focused", true);
    } else {
      this.removeAttribute("focused");
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
      <wa-textarea
        .value=${this.value ?? null}
        .placeholder=${this.placeholder}
        .readonly=${this.readonly}
        .required=${this.required}
        .rows=${this.rows ?? 4}
        .resize=${this.resize}
        .disabled=${this.disabled}
        name=${ifDefined(this.name)}
        autocapitalize=${ifDefined(this.autocapitalize || undefined)}
        autocomplete=${ifDefined(this.autocomplete)}
        .autofocus=${this.autofocus}
        .spellcheck=${this.spellcheck}
        inputmode=${ifDefined(this.inputmode || undefined)}
        enterkeyhint=${ifDefined(this.enterkeyhint || undefined)}
        minlength=${ifDefined(this.minlength)}
        maxlength=${ifDefined(this.maxlength)}
        class=${classMap({
          input: true,
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
        exportparts="base:wa-base, hint:wa-hint, textarea:wa-textarea"
      >
        ${this.label || hasLabelSlot
          ? html`<slot name="label" slot="label"
              >${this.label
                ? this._renderLabel(this.label, this.required)
                : nothing}</slot
            >`
          : nothing}
        <div
          slot="hint"
          class=${classMap({
            error: this.invalid || this._invalid,
          })}
          role=${ifDefined(this.invalid || this._invalid ? "alert" : undefined)}
          aria-live="polite"
        >
          ${this._invalid || this.invalid
            ? this.validationMessage || this._textarea?.validationMessage
            : this.hint ||
              (hasHintSlot ? html`<slot name="hint"></slot>` : nothing)}
        </div>
      </wa-textarea>
    `;
  }

  static styles = [
    waInputStyles,
    css`
      :host {
        display: flex;
        align-items: flex-start;
        padding-bottom: var(--ha-textarea-padding-bottom);
      }

      /* Label styling */
      wa-textarea::part(label) {
        width: calc(100% - var(--ha-space-2));
        background-color: var(--ha-color-form-background);
        transition:
          all var(--wa-transition-normal) ease-in-out,
          background-color var(--wa-transition-normal) ease-in-out;
        padding-inline-start: var(--ha-space-3);
        padding-inline-end: var(--ha-space-3);
        margin: var(--ha-space-1) var(--ha-space-1) 0;
        padding-top: var(--ha-space-4);
        white-space: nowrap;
        overflow: hidden;
      }

      :host(:focus-within) wa-textarea::part(label),
      :host([focused]) wa-textarea::part(label) {
        color: var(--primary-color);
      }

      wa-textarea.label-raised::part(label),
      :host(:focus-within) wa-textarea::part(label),
      :host([focused]) wa-textarea::part(label) {
        padding-top: var(--ha-space-2);
        font-size: var(--ha-font-size-xs);
      }

      wa-textarea.no-label::part(label) {
        height: 0;
        padding: 0;
      }

      /* Base styling */
      wa-textarea::part(base) {
        min-height: 56px;
        padding-top: var(--ha-space-6);
        padding-bottom: var(--ha-space-2);
      }

      wa-textarea.no-label::part(base) {
        padding-top: var(--ha-space-3);
      }

      wa-textarea::part(base)::after {
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

      :host(:focus-within) wa-textarea::part(base)::after,
      :host([focused]) wa-textarea::part(base)::after {
        height: 2px;
        background-color: var(--primary-color);
      }

      :host(:focus-within) wa-textarea.invalid::part(base)::after,
      wa-textarea.invalid:not([disabled])::part(base)::after {
        background-color: var(--ha-color-border-danger-normal);
      }

      /* Textarea element styling */
      wa-textarea::part(textarea) {
        padding: 0 var(--ha-space-4);
        font-family: var(--ha-font-family-body);
        font-size: var(--ha-font-size-m);
      }

      :host([resize="auto"]) wa-textarea::part(textarea) {
        max-height: var(--ha-textarea-max-height, 200px);
        overflow-y: auto;
      }

      wa-textarea:hover::part(base),
      wa-textarea:hover::part(label) {
        background-color: var(--ha-color-form-background-hover);
      }

      wa-textarea[disabled]::part(textarea) {
        cursor: not-allowed;
      }

      wa-textarea[disabled]::part(base),
      wa-textarea[disabled]::part(label) {
        background-color: var(--ha-color-form-background-disabled);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-textarea": HaTextArea;
  }
}
