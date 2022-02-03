import { mdiEye, mdiEyeOff } from "@mdi/js";
import "@material/mwc-textfield";
import type { TextField } from "@material/mwc-textfield";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  TemplateResult,
  PropertyValues,
} from "lit";
import { customElement, property, state, query } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-icon-button";
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

  @property({ type: Boolean }) public disabled = false;

  @state() private _unmaskedPassword = false;

  @query("mwc-textfield") private _input?: HTMLElement;

  public focus(): void {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult {
    const isPassword = MASKED_FIELDS.some((field) =>
      this.schema.name.includes(field)
    );
    return html`
      <mwc-textfield
        .type=${!isPassword
          ? this._stringType
          : this._unmaskedPassword
          ? "text"
          : "password"}
        .label=${this.label}
        .value=${this.data || ""}
        .disabled=${this.disabled}
        .required=${this.schema.required}
        .autoValidate=${this.schema.required}
        .suffix=${isPassword
          ? // reserve some space for the icon.
            html`<div style="width: 24px"></div>`
          : this.schema.description?.suffix}
        .validationMessage=${this.schema.required ? "Required" : undefined}
        @input=${this._valueChanged}
      ></mwc-textfield>
      ${isPassword
        ? html`<ha-icon-button
            toggles
            .label=${`${this._unmaskedPassword ? "Hide" : "Show"} password`}
            @click=${this._toggleUnmaskedPassword}
            .path=${this._unmaskedPassword ? mdiEyeOff : mdiEye}
          ></ha-icon-button>`
        : ""}
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    if (changedProps.has("schema")) {
      this.toggleAttribute("own-margin", !!this.schema.required);
    }
  }

  private _toggleUnmaskedPassword(): void {
    this._unmaskedPassword = !this._unmaskedPassword;
  }

  private _valueChanged(ev: Event): void {
    let value: string | undefined = (ev.target as TextField).value;
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

  private get _stringType(): string {
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

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        position: relative;
      }
      :host([own-margin]) {
        margin-bottom: 5px;
      }
      mwc-textfield {
        display: block;
      }
      ha-icon-button {
        position: absolute;
        top: 1em;
        right: 12px;
        --mdc-icon-button-size: 24px;
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-string": HaFormString;
  }
}
