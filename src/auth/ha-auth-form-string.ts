import { mdiEye, mdiEyeOff } from "@mdi/js";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  TemplateResult,
  html,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import {
  HaFormElement,
  HaFormStringData,
  HaFormStringSchema,
} from "../components/ha-form/types";
import "../components/ha-icon-button";

const MASKED_FIELDS = ["password", "secret", "token"];

@customElement("ha-auth-form-string")
export class HaAuthFormString extends LitElement implements HaFormElement {
  @property() public schema!: HaFormStringSchema;

  @property() public data!: HaFormStringData;

  @property() public label!: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @state() private _unmaskedPassword = false;

  @query("input") private _input?: HTMLInputElement;

  protected createRenderRoot() {
    return this;
  }

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
      <input
        .type=${!isPassword
          ? this._stringType
          : this._unmaskedPassword
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
        .suffix=${isPassword
          ? // reserve some space for the icon.
            html`<div style="width: 24px"></div>`
          : this.schema.description?.suffix}
        @input=${this._valueChanged}
        @change=${this._valueChanged}
      />
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
    let value: string | undefined = (ev.target as HTMLInputElement).value;
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
    // No shadow dom, styles should be in authorize.html.template
    return [];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-auth-form-string": HaAuthFormString;
  }
}
