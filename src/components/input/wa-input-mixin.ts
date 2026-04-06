import { type LitElement, css } from "lit";
import { property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { Constructor } from "../../types";
import { nativeElementInternalsSupported } from "../../common/feature-detect/support-native-element-internals";

/**
 * Minimal interface for the inner wa-input / wa-textarea element.
 */
export interface WaInput {
  value: string | null;
  select(): void;
  setSelectionRange(
    start: number,
    end: number,
    direction?: "forward" | "backward" | "none"
  ): void;
  setRangeText(
    replacement: string,
    start?: number,
    end?: number,
    selectMode?: "select" | "start" | "end" | "preserve"
  ): void;
  checkValidity(): boolean;
  validationMessage: string;
}

export interface WaInputMixinInterface {
  value?: string;
  label: string;
  hint?: string;
  placeholder: string;
  readonly: boolean;
  required: boolean;
  minlength?: number;
  maxlength?: number;
  autocapitalize:
    | "off"
    | "none"
    | "on"
    | "sentences"
    | "words"
    | "characters"
    | "";
  autocomplete?: string;
  autofocus: boolean;
  spellcheck: boolean;
  inputmode:
    | "none"
    | "text"
    | "decimal"
    | "numeric"
    | "tel"
    | "search"
    | "email"
    | "url"
    | "";
  enterkeyhint:
    | "enter"
    | "done"
    | "go"
    | "next"
    | "previous"
    | "search"
    | "send"
    | "";
  name?: string;
  disabled: boolean;
  validationMessage?: string;
  autoValidate: boolean;
  invalid: boolean;
  select(): void;
  setSelectionRange(
    start: number,
    end: number,
    direction?: "forward" | "backward" | "none"
  ): void;
  setRangeText(
    replacement: string,
    start?: number,
    end?: number,
    selectMode?: "select" | "start" | "end" | "preserve"
  ): void;
  checkValidity(): boolean;
  reportValidity(): boolean;
}

export const WaInputMixin = <T extends Constructor<LitElement>>(
  superClass: T
) => {
  class FormControlMixinClass extends superClass {
    @property()
    public value?: string;

    @property()
    public label? = "";

    @property()
    public hint? = "";

    @property()
    public placeholder? = "";

    @property({ type: Boolean })
    public readonly = false;

    @property({ type: Boolean, reflect: true })
    public required = false;

    @property({ type: Number })
    public minlength?: number;

    @property({ type: Number })
    public maxlength?: number;

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

    @property()
    public autocomplete?: string;

    @property({ type: Boolean })
    // eslint-disable-next-line lit/no-native-attributes
    public autofocus = false;

    @property({ type: Boolean })
    // eslint-disable-next-line lit/no-native-attributes
    public spellcheck = true;

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

    @property()
    public name?: string;

    @property({ type: Boolean })
    public disabled = false;

    @property({ attribute: "validation-message" })
    public validationMessage? = "";

    @property({ type: Boolean, attribute: "auto-validate" })
    public autoValidate = false;

    @property({ type: Boolean })
    public invalid = false;

    @state()
    protected _invalid = false;

    static shadowRootOptions: ShadowRootInit = {
      mode: "open",
      delegatesFocus: true,
    };

    /**
     * Override in subclass to return the inner wa-input / wa-textarea element.
     */
    protected get _formControl(): WaInput | undefined {
      throw new Error("_formControl getter must be implemented by subclass");
    }

    /**
     * Override in subclass to set the CSS custom property name
     * used for the required-marker character (e.g. "--ha-input-required-marker").
     */
    protected readonly _requiredMarkerCSSVar: string =
      "--ha-input-required-marker";

    public select(): void {
      this._formControl?.select();
    }

    public setSelectionRange(
      selectionStart: number,
      selectionEnd: number,
      selectionDirection?: "forward" | "backward" | "none"
    ): void {
      this._formControl?.setSelectionRange(
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
      this._formControl?.setRangeText(replacement, start, end, selectMode);
    }

    public checkValidity(): boolean {
      return nativeElementInternalsSupported
        ? (this._formControl?.checkValidity() ?? true)
        : true;
    }

    public reportValidity(): boolean {
      const valid = this.checkValidity();
      this._invalid = !valid;
      return valid;
    }

    protected _handleInput(): void {
      this.value = this._formControl?.value ?? undefined;
      if (this._invalid && this._formControl?.checkValidity()) {
        this._invalid = false;
      }
    }

    protected _handleChange(): void {
      this.value = this._formControl?.value ?? undefined;
    }

    protected _handleBlur(): void {
      if (this.autoValidate) {
        this._invalid = !this._formControl?.checkValidity();
      }
    }

    protected _handleInvalid(): void {
      this._invalid = true;
    }

    protected _renderLabel = memoizeOne((label: string, required: boolean) => {
      if (!required) {
        return label;
      }

      let marker = getComputedStyle(this).getPropertyValue(
        this._requiredMarkerCSSVar
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
  }

  return FormControlMixinClass;
};

/**
 * Shared styles for form controls (ha-input / ha-textarea).
 * Both components add the `control` CSS class to the inner wa-input / wa-textarea
 * element so these rules can target them with a single selector.
 */
export const waInputStyles = css`
  /* Inner element reset */
  .input {
    flex: 1;
    min-width: 0;
    --wa-transition-fast: var(--wa-transition-normal);
    position: relative;
  }

  /* Label base */
  .input::part(label) {
    position: absolute;
    top: 0;
    font-weight: var(--ha-font-weight-normal);
    font-family: var(--ha-font-family-body);
    transition: all var(--wa-transition-normal) ease-in-out;
    color: var(--secondary-text-color);
    line-height: var(--ha-line-height-condensed);
    z-index: 1;
    pointer-events: none;
    font-size: var(--ha-font-size-m);
  }

  /* Invalid label */
  :host(:focus-within) .input.invalid::part(label),
  .input.invalid:not([disabled])::part(label) {
    color: var(--ha-color-fill-danger-loud-resting);
  }

  /* Base common */
  .input::part(base) {
    background-color: var(--ha-color-form-background);
    border-top-left-radius: var(--ha-border-radius-sm);
    border-top-right-radius: var(--ha-border-radius-sm);
    border-bottom-left-radius: var(--ha-border-radius-square);
    border-bottom-right-radius: var(--ha-border-radius-square);
    border: none;
    position: relative;
    transition: background-color var(--wa-transition-normal) ease-in-out;
  }

  /* Focus outline removal */
  :host(:focus-within) .input::part(base) {
    outline: none;
  }

  /* Hint */
  .input::part(hint) {
    min-height: var(--ha-space-5);
    margin-block-start: 0;
    margin-inline-start: var(--ha-space-3);
    font-size: var(--ha-font-size-xs);
    display: flex;
    align-items: center;
    color: var(--ha-color-text-secondary);
  }

  .input.hint-hidden::part(hint) {
    height: 0;
    min-height: 0;
  }

  /* Error hint text */
  .error {
    color: var(--ha-color-on-danger-quiet);
  }
`;
