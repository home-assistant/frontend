import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { repeat } from "lit/directives/repeat";
import "../../../../src/components/ha-bar-slider";
import "../../../../src/components/ha-card";

const sliders: {
  mode?: "start" | "end" | "indicator";
  class?: string;
}[] = [
  {
    mode: "start",
  },
  {
    mode: "end",
  },
  {
    mode: "indicator",
  },
  {
    mode: "start",
    class: "custom",
  },
  {
    mode: "end",
    class: "custom",
  },
  {
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
      ${repeat(
        sliders,
        (slider) => html`
          <ha-card>
            <div class="card-content">
              <pre>Config: ${JSON.stringify(slider)}</pre>
              <ha-bar-slider
                .value=${this.value}
                @value-changed=${this.handleValueChanged}
                @slider-moved=${this.handleSliderMoved}
                mode=${ifDefined(slider.mode)}
                class=${ifDefined(slider.class)}
              >
              </ha-bar-slider>
            </div>
          </ha-card>
        `
      )}
      <ha-card>
        <div class="card-content">
          <p class="title"><b>Vertical</b></p>
          <div class="vertical-sliders">
            ${repeat(
              sliders,
              (slider) => html`
                <ha-bar-slider
                  .value=${this.value}
                  @value-changed=${this.handleValueChanged}
                  @slider-moved=${this.handleSliderMoved}
                  mode=${ifDefined(slider.mode)}
                  orientation="vertical"
                  class=${ifDefined(slider.class)}
                >
                </ha-bar-slider>
              `
            )}
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
