import { CSSResultGroup } from "lit";
import { customElement } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { HaForm } from "../components/ha-form/ha-form";
import { HaFormElement, HaFormSchema } from "../components/ha-form/types";
import "./ha-auth-form-string";

@customElement("ha-auth-form")
export class HaAuthForm extends HaForm {
  protected fieldElementName(type: string): string {
    if (type === "string") {
      return "ha-auth-form-string";
    }
    return super.fieldElementName(type);
  }

  protected createRenderRoot() {
    // attach it as soon as possible to make sure we fetch all events.
    this.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      const schema = (ev.target as HaFormElement).schema as HaFormSchema;

      if (ev.target === this) return;

      const newValue = !schema.name
        ? ev.detail.value
        : { [schema.name]: ev.detail.value };

      fireEvent(this, "value-changed", {
        value: { ...this.data, ...newValue },
      });
    });
    return this;
  }

  static get styles(): CSSResultGroup {
    // No shadow dom, styles should be in authorize.html.template
    return [];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-auth-form": HaAuthForm;
  }
}
