import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { ensureArray } from "../../common/array/ensure-array";
import { fireEvent } from "../../common/dom/fire_event";
import type { StringSelector } from "../../data/selector";
import type { HomeAssistant, ValueChangedEvent } from "../../types";
import "../ha-textarea";
import "../input/ha-input";
import "../input/ha-input-multi";

@customElement("ha-selector-text")
export class HaTextSelector extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public value?: any;

  @property() public name?: string;

  @property() public label?: string;

  @property() public placeholder?: string;

  @property() public helper?: string;

  @property({ attribute: false }) public selector!: StringSelector;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @query("ha-input, ha-textarea") private _input?: HTMLInputElement;

  public async focus() {
    await this.updateComplete;
    this._input?.focus();
  }

  public reportValidity(): boolean {
    if (this.selector.text?.multiple) {
      return true;
    }
    return this._input?.reportValidity() ?? true;
  }

  protected render() {
    if (this.selector.text?.multiple) {
      return html`
        <ha-input-multi
          .value=${ensureArray(this.value ?? [])}
          .disabled=${this.disabled}
          .label=${this.label}
          .inputType=${this.selector.text?.type}
          .inputSuffix=${this.selector.text?.suffix}
          .inputPrefix=${this.selector.text?.prefix}
          .helper=${this.helper}
          .autocomplete=${this.selector.text?.autocomplete}
          @value-changed=${this._handleChange}
        >
        </ha-input-multi>
      `;
    }
    if (this.selector.text?.multiline) {
      return html`<ha-textarea
        .name=${this.name}
        .label=${this.label}
        .placeholder=${this.placeholder}
        .value=${this.value || ""}
        .hint=${this.helper}
        .disabled=${this.disabled}
        @input=${this._handleChange}
        autocapitalize="none"
        .autocomplete=${this.selector.text?.autocomplete}
        spellcheck="false"
        .required=${this.required}
        resize="auto"
      ></ha-textarea>`;
    }
    return html`<ha-input
      .name=${this.name}
      .value=${this.value || ""}
      .placeholder=${this.placeholder || this.selector.text?.placeholder || ""}
      .hint=${this.helper}
      .disabled=${this.disabled}
      .type=${this.selector.text?.type}
      @input=${this._handleChange}
      @change=${this._handleChange}
      .label=${this.label || ""}
      .required=${this.required}
      .autocomplete=${this.selector.text?.autocomplete}
      .passwordToggle=${this.selector.text?.type === "password"}
    >
      ${this.selector.text?.prefix
        ? html`<span slot="start">${this.selector.text.prefix}</span>`
        : nothing}
      ${this.selector.text?.suffix
        ? html`<span slot="end">${this.selector.text.suffix}</span>`
        : nothing}
    </ha-input>`;
  }

  private _handleChange(ev: ValueChangedEvent<string> | InputEvent) {
    ev.stopPropagation();
    let value: string | undefined =
      (ev as ValueChangedEvent<string>).detail?.value ??
      (ev.target as HTMLInputElement).value;
    if (this.value === value) {
      return;
    }
    if (
      (value === "" || (Array.isArray(value) && value.length === 0)) &&
      !this.required
    ) {
      value = undefined;
    }

    fireEvent(this, "value-changed", { value });
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
    }
    ha-textarea,
    ha-input {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-text": HaTextSelector;
  }
}
