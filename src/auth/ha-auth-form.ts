/* eslint-disable lit/prefer-static-styles */
import { customElement } from "lit/decorators";
import { HaForm } from "../components/ha-form/ha-form";
import "./ha-auth-form-string";

@customElement("ha-auth-form")
export class HaAuthForm extends HaForm {
  protected fieldElementName(type: string): string {
    if (type === "string") {
      return `ha-auth-form-${type}`;
    }
    return super.fieldElementName(type);
  }

  protected createRenderRoot() {
    // add parent style to light dom
    const style = document.createElement("style");
    style.innerHTML = HaForm.elementStyles as unknown as string;
    this.append(style);
    // attach it as soon as possible to make sure we fetch all events.
    this.addValueChangedListener(this);
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-auth-form": HaAuthForm;
  }
}
