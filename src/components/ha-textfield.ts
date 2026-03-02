import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import "./input/ha-input";
import type { HaInput } from "./input/ha-input";

/**
 * Legacy wrapper around ha-input that preserves the mwc-textfield API.
 * New code should use ha-input directly.
 * @deprecated Use ha-input instead.
 */
@customElement("ha-textfield")
export class HaTextField extends LitElement {
  @property({ type: String })
  public value = "";

  @property({ type: String })
  public type:
    | "text"
    | "search"
    | "tel"
    | "url"
    | "email"
    | "password"
    | "date"
    | "month"
    | "week"
    | "time"
    | "datetime-local"
    | "number"
    | "color" = "text";

  @property({ type: String })
  public label = "";

  @property({ type: String })
  public placeholder = "";

  @property({ type: String })
  public prefix = "";

  @property({ type: String })
  public suffix = "";

  @property({ type: Boolean })
  // @ts-ignore
  public icon = false;

  @property({ type: Boolean })
  // @ts-ignore
  // eslint-disable-next-line lit/attribute-names
  public iconTrailing = false;

  @property({ type: Boolean })
  public disabled = false;

  @property({ type: Boolean })
  public required = false;

  @property({ type: Number, attribute: "minlength" })
  public minLength = -1;

  @property({ type: Number, attribute: "maxlength" })
  public maxLength = -1;

  @property({ type: Boolean, reflect: true })
  public outlined = false;

  @property({ type: String })
  public helper = "";

  @property({ type: Boolean, attribute: "validateoninitialrender" })
  public validateOnInitialRender = false;

  @property({ type: String, attribute: "validationmessage" })
  public validationMessage = "";

  @property({ type: Boolean, attribute: "autovalidate" })
  public autoValidate = false;

  @property({ type: String })
  public pattern = "";

  @property()
  public min: number | string = "";

  @property()
  public max: number | string = "";

  @property()
  public step: number | "any" | null = null;

  @property({ type: Number })
  public size: number | null = null;

  @property({ type: Boolean, attribute: "helperpersistent" })
  public helperPersistent = false;

  @property({ attribute: "charcounter" })
  public charCounter: boolean | "external" | "internal" = false;

  @property({ type: Boolean, attribute: "endaligned" })
  public endAligned = false;

  @property({ type: String, attribute: "inputmode" })
  public inputMode = "";

  @property({ type: Boolean, reflect: true, attribute: "readonly" })
  public readOnly = false;

  @property({ type: String })
  public name = "";

  @property({ type: String })
  // eslint-disable-next-line lit/no-native-attributes
  public autocapitalize = "";

  // --- ha-textfield-specific properties ---

  @property({ type: Boolean })
  public invalid = false;

  @property({ attribute: "error-message" })
  public errorMessage?: string;

  @property()
  public autocomplete?: string;

  @property({ type: Boolean })
  public autocorrect = true;

  @property({ attribute: "input-spellcheck" })
  public inputSpellcheck?: string;

  @query("ha-input")
  private _haInput?: HaInput;

  static shadowRootOptions: ShadowRootInit = {
    mode: "open",
    delegatesFocus: true,
  };

  public get formElement(): HTMLInputElement | undefined {
    return (this._haInput as any)?._input?.input;
  }

  public select(): void {
    this._haInput?.select();
  }

  public setSelectionRange(
    selectionStart: number,
    selectionEnd: number,
    selectionDirection?: "forward" | "backward" | "none"
  ): void {
    this._haInput?.setSelectionRange(
      selectionStart,
      selectionEnd,
      selectionDirection
    );
  }

  public setRangeText(
    replacement: string,
    start?: number,
    end?: number,
    selectMode?: "select" | "start" | "end" | "preserve"
  ): void {
    this._haInput?.setRangeText(replacement, start, end, selectMode);
  }

  public checkValidity(): boolean {
    return this._haInput?.checkValidity() ?? true;
  }

  public reportValidity(): boolean {
    return this._haInput?.reportValidity() ?? true;
  }

  public setCustomValidity(message: string): void {
    this.validationMessage = message;
    this.invalid = !!message;
  }

  /** No-op. Preserved for backward compatibility. */
  public layout(): void {
    // no-op — mwc-textfield needed this for notched outline recalculation
  }

  protected override firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    if (this.validateOnInitialRender) {
      this.reportValidity();
    }
  }

  protected override updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (changedProperties.has("invalid") && this._haInput) {
      if (
        this.invalid ||
        (changedProperties.get("invalid") !== undefined && !this.invalid)
      ) {
        this.reportValidity();
      }
    }
  }

  private _mapType(
    type: string
  ):
    | "text"
    | "search"
    | "tel"
    | "url"
    | "email"
    | "password"
    | "date"
    | "datetime-local"
    | "number"
    | "time" {
    // mwc-textfield supports "color", "month", "week" which ha-input doesn't
    switch (type) {
      case "text":
      case "search":
      case "tel":
      case "url":
      case "email":
      case "password":
      case "date":
      case "datetime-local":
      case "number":
      case "time":
        return type;
      default:
        return "text";
    }
  }

  protected override render(): TemplateResult {
    const errorMsg = this.errorMessage || this.validationMessage;
    return html`
      <ha-input
        .type=${this._mapType(this.type)}
        .value=${this.value || undefined}
        .label=${this.label}
        .placeholder=${this.placeholder}
        .disabled=${this.disabled}
        .required=${this.required}
        .readonly=${this.readOnly}
        .pattern=${this.pattern || undefined}
        .minlength=${this.minLength > 0 ? this.minLength : undefined}
        .maxlength=${this.maxLength > 0 ? this.maxLength : undefined}
        .min=${this.min !== "" ? this.min : undefined}
        .max=${this.max !== "" ? this.max : undefined}
        .step=${this.step ?? undefined}
        .name=${this.name || undefined}
        .autocomplete=${this.autocomplete}
        .autocorrect=${this.autocorrect}
        .spellcheck=${this.inputSpellcheck === "true"}
        .inputmode=${this._mapInputMode(this.inputMode)}
        .autocapitalize=${this.autocapitalize || ""}
        .invalid=${this.invalid}
        .validationMessage=${errorMsg || ""}
        .autoValidate=${this.autoValidate}
        .hint=${this.helper}
        .withoutSpinButtons=${this.type === "number"}
        @input=${this._onInput}
        @change=${this._onChange}
      >
        ${this.icon
          ? html`<slot name="leadingIcon" slot="start"></slot>`
          : nothing}
        ${this.prefix
          ? html`<span class="prefix" slot="start">${this.prefix}</span>`
          : nothing}
        ${this.suffix
          ? html`<span class="suffix" slot="end">${this.suffix}</span>`
          : nothing}
        ${this.iconTrailing
          ? html`<slot name="trailingIcon" slot="end"></slot>`
          : nothing}
      </ha-input>
    `;
  }

  private _mapInputMode(
    mode: string
  ):
    | "none"
    | "text"
    | "decimal"
    | "numeric"
    | "tel"
    | "search"
    | "email"
    | "url"
    | "" {
    switch (mode) {
      case "none":
      case "text":
      case "decimal":
      case "numeric":
      case "tel":
      case "search":
      case "email":
      case "url":
        return mode;
      default:
        return "";
    }
  }

  private _onInput(): void {
    this.value = this._haInput?.value ?? "";
  }

  private _onChange(): void {
    this.value = this._haInput?.value ?? "";
  }

  static override styles = css`
    :host {
      display: inline-flex;
      flex-direction: column;
      outline: none;
    }

    ha-input {
      --ha-input-padding-bottom: 0;
      width: 100%;
    }

    .prefix,
    .suffix {
      color: var(--secondary-text-color);
    }

    .prefix {
      margin-inline-end: var(--text-field-prefix-padding-right);
    }

    /* Edge, hide reveal password icon */
    ::-ms-reveal {
      display: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-textfield": HaTextField;
  }
}
