import { mdiEye, mdiEyeOff } from "@mdi/js";
import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HaFormSchema } from "../components/ha-form/types";
import { makeIcon } from "./utils";

@customElement("ha-authorize-field")
export class HaAuthorizeField extends LitElement {
  @property({ attribute: false })
  public schema!: HaFormSchema;

  @property({ attribute: false })
  public name!: string;

  @property({ attribute: false })
  public defaultValue?: string;
  /* TODO: see if we still need a defaultvalue (does lit persist the value across updates?) */

  @state()
  private _showing = false;

  protected render() {
    /* eslint-disable lit/no-value-attribute */
    if (this.schema.type === "string") {
      const type =
        this.schema.name === "password"
          ? "password"
          : this.schema.name === "code"
          ? "number"
          : "text";
      const autocomplete =
        this.schema.name === "username"
          ? "username"
          : this.schema.name === "password"
          ? "current-password"
          : this.schema.name === "code"
          ? "one-time-code"
          : undefined;
      return html`
        <input
          name=${this.schema.name}
          placeholder=${this.name}
          type=${this._showing ? "text" : type}
          autocomplete=${autocomplete}
          ?required=${this.schema.required}
          value=${this.defaultValue || nothing}
        />
        <div class="bar"></div>
        ${type === "password"
          ? html`<button type="button" @click=${this._togglePassword}>
              ${makeIcon(this._showing ? mdiEyeOff : mdiEye, "")}
            </button>`
          : nothing}
      `;
    }
    if (this.schema.type === "select") {
      return html`
        <select name=${this.schema.name} ?required=${this.schema.required}>
          ${this.schema.options.map(
            (option) => html`<option value=${option[0]}>${option[1]}</option>`
          )}
        </select>
        <div class="bar"></div>
        <span class="name">${this.name}</span>
      `;
    }
    return nothing;
  }

  private _togglePassword() {
    this._showing = !this._showing;
  }

  protected createRenderRoot() {
    return this;
  }
}
