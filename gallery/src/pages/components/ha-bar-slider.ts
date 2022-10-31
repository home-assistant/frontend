import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { repeat } from "lit/directives/repeat";
import "../../../../src/components/ha-bar-slider";
import "../../../../src/components/ha-card";

const sliders: {
  id: string;
  label: string;
  mode?: "start" | "end" | "indicator";
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
    id: "slider-indicator",
    label: "Slider (indicator mode)",
    mode: "indicator",
  },
  {
    id: "slider-start-custom",
    label: "Slider (start mode) and custom style",
    mode: "start",
    class: "custom",
  },
  {
    id: "slider-end-custom",
    label: "Slider (end mode) and custom style",
    mode: "end",
    class: "custom",
  },
  {
    id: "slider-indicator-custom",
    label: "Slider (indicator mode) and custom style",
    mode: "indicator",
    class: "custom",
  },
];

@customElement("demo-components-ha-bar-slider")
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
              <ha-bar-slider
                .value=${this.value}
                .mode=${config.mode}
                class=${ifDefined(config.class)}
                @value-changed=${this.handleValueChanged}
                @slider-moved=${this.handleSliderMoved}
                aria-labelledby=${id}
              >
              </ha-bar-slider>
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
                <ha-bar-slider
                  .value=${this.value}
                  .mode=${config.mode}
                  vertical
                  class=${ifDefined(config.class)}
                  @value-changed=${this.handleValueChanged}
                  @slider-moved=${this.handleSliderMoved}
                  aria-label=${label}
                >
                </ha-bar-slider>
              `;
            })}
          </div>
        </div>
      </ha-card>
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
        --slider-bar-color: #ffcf4c;
        --slider-bar-background: #ffcf4c64;
        --slider-bar-thickness: 100px;
        --slider-bar-border-radius: 24px;
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
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-bar-slider": DemoHaBarSlider;
  }
}
