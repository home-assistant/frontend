import { LitElement, TemplateResult, css, html } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-control-number-buttons";
import { repeat } from "lit/directives/repeat";
import { ifDefined } from "lit/directives/if-defined";

const buttons: {
  id: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  class?: string;
}[] = [
  {
    id: "basic",
    label: "Basic",
  },
  {
    id: "min_max_step",
    label: "With min/max and step",
    min: 5,
    max: 25,
    step: 0.5,
  },
  {
    id: "custom",
    label: "Custom",
    class: "custom",
  },
];

@customElement("demo-components-ha-control-number-buttons")
export class DemoHarControlNumberButtons extends LitElement {
  @state() value = 5;

  private _valueChanged(ev) {
    this.value = ev.detail.value;
  }

  protected render(): TemplateResult {
    return html`
      ${repeat(buttons, (button) => {
        const { id, label, ...config } = button;
        return html`
          <ha-card>
            <div class="card-content">
              <label id=${id}>${label}</label>
              <pre>Config: ${JSON.stringify(config)}</pre>
              <ha-control-number-buttons
                .value=${this.value}
                .min=${config.min}
                .max=${config.max}
                .step=${config.step}
                class=${ifDefined(config.class)}
                @value-changed=${this._valueChanged}
                .label=${label}
              >
              </ha-control-number-buttons>
            </div>
          </ha-card>
        `;
      })}
    `;
  }

  static get styles() {
    return css`
      ha-card {
        max-width: 600px;
        margin: 24px auto;
      }
      pre {
        margin-top: 0;
        margin-bottom: 8px;
      }
      p {
        margin: 0;
      }
      label {
        font-weight: 600;
      }
      .custom {
        color: #2196f3;
        --control-number-buttons-color: #2196f3;
        --control-number-buttons-background-color: #2196f3;
        --control-number-buttons-background-opacity: 0.1;
        --control-number-buttons-thickness: 100px;
        --control-number-buttons-border-radius: 24px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-control-number-buttons": DemoHarControlNumberButtons;
  }
}
