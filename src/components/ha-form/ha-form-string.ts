/* eslint-disable lit/prefer-static-styles */
import { mdiEye, mdiEyeOff } from "@mdi/js";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-icon-button";
import "../ha-textfield";
import type { HaTextField } from "../ha-textfield";
import type {
  HaFormElement,
  HaFormStringData,
  HaFormStringSchema,
} from "./types";

const MASKED_FIELDS = ["password", "secret", "token"];

@customElement("ha-form-string")
export class HaFormString extends LitElement implements HaFormElement {
  @property() public schema!: HaFormStringSchema;

  @property() public data!: HaFormStringData;

  @property() public label!: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @state() protected unmaskedPassword = false;

  @query("ha-textfield") private _input?: HaTextField;

  public focus(): void {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult {
    return html`
      <ha-textfield
        .type=${!this.isPassword
          ? this.stringType
          : this.unmaskedPassword
          ? "text"
          : "password"}
        .label=${this.label}
        .value=${this.data || ""}
        .helper=${this.helper}
        helperPersistent
        .disabled=${this.disabled}
        .required=${this.schema.required}
        .autoValidate=${this.schema.required}
        .name=${this.schema.name}
        .autocomplete=${this.schema.autocomplete}
        .suffix=${this.isPassword
          ? // reserve some space for the icon.
            html`<div style="width: 24px"></div>`
          : this.schema.description?.suffix}
        .validationMessage=${this.schema.required ? "Required" : undefined}
        @input=${this._valueChanged}
        @change=${this._valueChanged}
      ></ha-textfield>
      ${this.renderIcon()}
    `;
  }

  protected renderIcon() {
    if (!this.isPassword) return nothing;
    return html`
      <ha-icon-button
        toggles
        .label=${`${this.unmaskedPassword ? "Hide" : "Show"} password`}
        @click=${this.toggleUnmaskedPassword}
        .path=${this.unmaskedPassword ? mdiEyeOff : mdiEye}
      ></ha-icon-button>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    if (changedProps.has("schema")) {
      this.toggleAttribute("own-margin", !!this.schema.required);
    }
  }

  protected toggleUnmaskedPassword(): void {
    this.unmaskedPassword = !this.unmaskedPassword;
  }

  protected _valueChanged(ev: Event): void {
    let value: string | undefined = (ev.target as HaTextField).value;
    if (this.data === value) {
      return;
    }
    if (value === "" && !this.schema.required) {
      value = undefined;
    }
    fireEvent(this, "value-changed", {
      value,
    });
  }

  protected get stringType(): string {
    if (this.schema.format) {
      if (["email", "url"].includes(this.schema.format)) {
        return this.schema.format;
      }
      if (this.schema.format === "fqdnurl") {
        return "url";
      }
    }
    return "text";
  }

  protected get isPassword(): boolean {
    return MASKED_FIELDS.some((field) => this.schema.name.includes(field));
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        position: relative;
      }
      :host([own-margin]) {
        margin-bottom: 5px;
      }
      ha-textfield {
        display: block;
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
    "ha-form-string": HaFormString;
  }
}
