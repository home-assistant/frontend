import { html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { HaFormSchema } from "../components/ha-form/ha-form";
import { DataEntryFlowStep } from "../data/data_entry_flow";

declare global {
  interface HASSDomEvents {
    submit: undefined;
  }
}

const ENABLED_HANDLERS = [
  "homeassistant",
  "legacy_api_password",
  "command_line",
];

@customElement("ha-password-manager-polyfill")
export class HaPasswordManagerPolyfill extends LitElement {
  @property() public step?: DataEntryFlowStep;

  @property() public stepData: any;

  protected createRenderRoot() {
    // Add under document body so the element isn't placed inside any shadow roots
    return document.body;
  }

  // Making this static for Lit doesn't work since Lit places these in the shadow dom
  styles = `
    .password-manager-polyfill {
      position: absolute;
      top: 170px;
      left: 50%;
      width: 0;
      height: 0;
      overflow: hidden;
    }
    .password-manager-polyfill input {
      width: 210px;
      height: 60px;
    }
  `;

  protected render(): TemplateResult {
    if (
      this.step &&
      this.step.type === "form" &&
      this.step.step_id === "init" &&
      ENABLED_HANDLERS.includes(this.step.handler[0])
    ) {
      return html`
        <form
          class="password-manager-polyfill"
          aria-hidden="true"
          @submit=${this._handleSubmit}
        >
          ${this.step.data_schema.map((input) => this.render_input(input))}
          <input type="submit" />
          <style>
            ${this.styles}
          </style>
        </form>
      `;
    }
    return html``;
  }

  private render_input(schema: HaFormSchema): TemplateResult {
    const inputType = schema.name.includes("password") ? "password" : "text";
    if (schema.type === "string") {
      return html`
        <input
          tabindex="-1"
          id=${schema.name}
          type=${inputType}
          .value=${this.stepData[schema.name] || ""}
          @input=${this._valueChanged}
        />
      `;
    }
    return html``;
  }

  private _handleSubmit(ev: Event) {
    ev.preventDefault();
    fireEvent(this, "submit");
  }

  private _valueChanged(ev: Event) {
    const target = ev.target! as HTMLInputElement;
    this.stepData[target.id] = target.value;
    fireEvent(this, "value-changed", { value: { ...this.stepData } });
  }
}
