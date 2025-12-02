import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { repeat } from "lit/directives/repeat";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-control-slider";

const sliders: {
  id: string;
  label: string;
  mode?: "start" | "end" | "cursor";
  unit?: string;
  class?: string;
}[] = [
  {
    id: "slider-start",
    label: "Slider (start mode)",
    mode: "start",
  },
  {
    id: "slider-end",
    label: "Slider (end mode)",
    mode: "end",
  },
  {
    id: "slider-cursor",
    label: "Slider (cursor mode)",
    mode: "cursor",
  },
  {
    id: "slider-start-custom",
    label: "Slider (start mode) and custom style",
    mode: "start",
    class: "custom",
    unit: "mm",
  },
  {
    id: "slider-end-custom",
    label: "Slider (end mode) and custom style",
    mode: "end",
    class: "custom",
    unit: "mm",
  },
  {
    id: "slider-cursor-custom",
    label: "Slider (cursor mode) and custom style",
    mode: "cursor",
    class: "custom",
    unit: "mm",
  },
];

@customElement("demo-components-ha-control-slider")
export class DemoHaBarSlider extends LitElement {
  @state() private value = 50;

  @state() private sliderPosition?: number;

  handleValueChanged(e: CustomEvent) {
    this.value = e.detail.value as number;
  }

  handleSliderMoved(e: CustomEvent) {
    this.sliderPosition = e.detail.value as number;
  }

  protected render(): TemplateResult {
    return html`
      <ha-card>
        <div class="card-content">
          <p><b>Slider values</b></p>
          <table>
            <tbody>
              <tr>
                <td>position</td>
                <td>${this.sliderPosition ?? "-"}</td>
              </tr>
              <tr>
                <td>value</td>
                <td>${this.value ?? "-"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ha-card>
      ${repeat(sliders, (slider) => {
        const { id, label, ...config } = slider;
        return html`
          <ha-card>
            <div class="card-content">
              <label id=${id}>${label}</label>
              <pre>Config: ${JSON.stringify(config)}</pre>
              <ha-control-slider
                .value=${this.value}
                .mode=${config.mode}
                class=${ifDefined(config.class)}
                @value-changed=${this.handleValueChanged}
                @slider-moved=${this.handleSliderMoved}
                .label=${label}
                .unit=${config.unit}
              >
              </ha-control-slider>
            </div>
          </ha-card>
        `;
      })}
      <ha-card>
        <div class="card-content">
          <p class="title"><b>Vertical</b></p>
          <div class="vertical-sliders">
            ${repeat(sliders, (slider) => {
              const { id, label, ...config } = slider;
              return html`
                <ha-control-slider
                  .value=${this.value}
                  .mode=${config.mode}
                  vertical
                  class=${ifDefined(config.class)}
                  @value-changed=${this.handleValueChanged}
                  @slider-moved=${this.handleSliderMoved}
                  .label=${label}
                  .unit=${config.unit}
                >
                </ha-control-slider>
              `;
            })}
          </div>
        </div>
      </ha-card>
    `;
  }

  static styles = css`
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
      font-weight: var(--ha-font-weight-bold);
    }
    .custom {
      --control-slider-color: #ffcf4c;
      --control-slider-background: #ffcf4c;
      --control-slider-background-opacity: 0.2;
      --control-slider-thickness: 130px;
      --control-slider-border-radius: var(--ha-border-radius-6xl);
    }
    .vertical-sliders {
      height: 300px;
      display: flex;
      flex-direction: row;
      justify-content: space-between;
    }
    p.title {
      margin-bottom: 12px;
    }
    .vertical-sliders > *:not(:last-child) {
      margin-right: 4px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-control-slider": DemoHaBarSlider;
  }
}
