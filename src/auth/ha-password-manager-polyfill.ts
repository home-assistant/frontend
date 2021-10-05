/* eslint-disable lit/prefer-static-styles */
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { HaFormSchema } from "../components/ha-form/ha-form";
import { DataEntryFlowStep } from "../data/data_entry_flow";

declare global {
  interface HTMLElementTagNameMap {
    "ha-password-manager-polyfill": HaPasswordManagerPolyfill;
  }
  interface HASSDomEvents {
    "form-submitted": undefined;
  }
}

const ENABLED_HANDLERS = [
  "homeassistant",
  "legacy_api_password",
  "command_line",
];

@customElement("ha-password-manager-polyfill")
export class HaPasswordManagerPolyfill extends LitElement {
  @property({ attribute: false }) public step?: DataEntryFlowStep;

  @property({ attribute: false }) public stepData: any;

  @property({ attribute: false }) public boundingRect?: DOMRect;

  protected createRenderRoot() {
    // Add under document body so the element isn't placed inside any shadow roots
    return document.body;
  }

  private get styles() {
    return `
    .password-manager-polyfill {
      position: absolute;
      top: ${this.boundingRect?.y || 148}px;
      left: calc(50% - ${(this.boundingRect?.width || 360) / 2}px);
      width: ${this.boundingRect?.width || 360}px;
      opacity: 0;
      z-index: -1;
    }
    .password-manager-polyfill input {
      width: 100%;
      height: 62px;
      padding: 0;
      border: 0;
    }
    .password-manager-polyfill input[type="submit"] {
      width: 0;
      height: 0;
    }
  `;
  }

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

  private render_input(schema: HaFormSchema): TemplateResult | string {
    const inputType = schema.name.includes("password") ? "password" : "text";
    if (schema.type !== "string") {
      return "";
    }
    return html`
      <input
        tabindex="-1"
        .id=${schema.name}
        .type=${inputType}
        .value=${this.stepData[schema.name] || ""}
        @input=${this._valueChanged}
      />
    `;
  }

  private _handleSubmit(ev: Event) {
    ev.preventDefault();
    fireEvent(this, "form-submitted");
  }

  private _valueChanged(ev: Event) {
    const target = ev.target! as HTMLInputElement;
    this.stepData = { ...this.stepData, [target.id]: target.value };
    fireEvent(this, "value-changed", {
      value: this.stepData,
    });
  }
}
