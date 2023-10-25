import { mdiEye, mdiEyeOff } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { StringSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../ha-icon-button";
import "../ha-textarea";
import "../ha-textfield";

@customElement("ha-selector-text")
export class HaTextSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public value?: any;

  @property() public name?: string;

  @property() public label?: string;

  @property() public placeholder?: string;

  @property() public helper?: string;

  @property() public selector!: StringSelector;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @state() private _unmaskedPassword = false;

  public async focus() {
    await this.updateComplete;
    (
      this.renderRoot.querySelector("ha-textarea, ha-textfield") as HTMLElement
    )?.focus();
  }

  protected render() {
    if (this.selector.text?.multiline) {
      return html`<ha-textarea
        .name=${this.name}
        .label=${this.label}
        .placeholder=${this.placeholder}
        .value=${this.value || ""}
        .helper=${this.helper}
        helperPersistent
        .disabled=${this.disabled}
        @input=${this._handleChange}
        autocapitalize="none"
        .autocomplete=${this.selector.text?.autocomplete}
        spellcheck="false"
        .required=${this.required}
        autogrow
      ></ha-textarea>`;
    }
    return html`<ha-textfield
        .name=${this.name}
        .value=${this.value || ""}
        .placeholder=${this.placeholder || ""}
        .helper=${this.helper}
        helperPersistent
        .disabled=${this.disabled}
        .type=${this._unmaskedPassword ? "text" : this.selector.text?.type}
        @input=${this._handleChange}
        .label=${this.label || ""}
        .prefix=${this.selector.text?.prefix}
        .suffix=${this.selector.text?.type === "password"
          ? // reserve some space for the icon.
            html`<div style="width: 24px"></div>`
          : this.selector.text?.suffix}
        .required=${this.required}
        .autocomplete=${this.selector.text?.autocomplete}
      ></ha-textfield>
      ${this.selector.text?.type === "password"
        ? html`<ha-icon-button
            toggles
            .label=${`${this._unmaskedPassword ? "Hide" : "Show"} password`}
            @click=${this._toggleUnmaskedPassword}
            .path=${this._unmaskedPassword ? mdiEyeOff : mdiEye}
          ></ha-icon-button>`
        : ""}`;
  }

  private _toggleUnmaskedPassword(): void {
    this._unmaskedPassword = !this._unmaskedPassword;
  }

  private _handleChange(ev) {
    let value = ev.target.value;
    if (this.value === value) {
      return;
    }
    if (value === "" && !this.required) {
      value = undefined;
    }

    fireEvent(this, "value-changed", { value });
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        position: relative;
      }
      ha-textarea,
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
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-text": HaTextSelector;
  }
}
