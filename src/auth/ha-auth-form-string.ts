import type { TemplateResult } from "lit";
import { html } from "lit";
import { customElement, query } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { HaFormString } from "../components/ha-form/ha-form-string";
import "./ha-auth-textfield";
import type { HaAuthTextField } from "./ha-auth-textfield";

@customElement("ha-auth-form-string")
export class HaAuthFormString extends HaFormString {
  @query("ha-auth-textfield") private _textfield?: HaAuthTextField;

  protected override createRenderRoot() {
    return this;
  }

  public override focus(): void {
    this._textfield?.focus();
  }

  public override reportValidity(): boolean {
    const textfield = this._textfield;
    if (!textfield) {
      return true;
    }
    const valid = textfield.reportValidity();
    // Adopt a value a password manager wrote without an event reaching us.
    const value = textfield.value ?? "";
    if ((this.data ?? "") !== value) {
      fireEvent(this, "value-changed", { value });
    }
    return valid;
  }

  protected override render(): TemplateResult {
    return html`
      <ha-auth-textfield
        .passwordToggle=${this.isPassword}
        .type=${!this.isPassword ? this.stringType : "password"}
        .label=${this.label}
        .value=${this.data || ""}
        .hint=${this.helper}
        .disabled=${this.disabled}
        .required=${!!this.schema.required}
        .autoValidate=${!!this.schema.required}
        .name=${this.schema.name}
        .autofocus=${!!this.schema.autofocus}
        .autocomplete=${this.schema.autocomplete}
        .validationMessage=${
          this.schema.required
            ? this.localize?.("ui.panel.page-authorize.form.error_required")
            : undefined
        }
        .showPasswordLabel=${this.localize?.(
          "ui.panel.page-authorize.form.show_password"
        )}
        .hidePasswordLabel=${this.localize?.(
          "ui.panel.page-authorize.form.hide_password"
        )}
        @input=${this._valueChanged}
        @change=${this._valueChanged}
      ></ha-auth-textfield>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-auth-form-string": HaAuthFormString;
  }
}
