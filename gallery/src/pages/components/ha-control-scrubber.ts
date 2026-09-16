import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { repeat } from "lit/directives/repeat";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-control-scrubber";

const scrubbers: {
  id: string;
  label: string;
  unit?: string;
  class?: string;
  disabled?: boolean;
}[] = [
  {
    id: "scrubber-default",
    label: "Scrubber",
    unit: "%",
  },
  {
    id: "scrubber-zoomed",
    label: "Scrubber with a wider strip",
    unit: "%",
    class: "zoomed",
  },
  {
    id: "scrubber-disabled",
    label: "Scrubber (disabled)",
    unit: "%",
    disabled: true,
  },
];

@customElement("demo-components-ha-control-scrubber")
export class DemoHaControlScrubber extends LitElement {
  @state() private value = 50;

  @state() private hue = 200;

  @state() private position?: number;

  handleValueChanged(e: CustomEvent) {
    this.value = e.detail.value as number;
  }

  handleHueChanged(e: CustomEvent) {
    this.hue = e.detail.value as number;
  }

  handleMoved(e: CustomEvent) {
    this.position = e.detail.value as number;
  }

  protected render(): TemplateResult {
    return html`
      <ha-card>
        <div class="card-content">
          <p><b>Scrubber values</b></p>
          <table>
            <tbody>
              <tr>
                <td>position</td>
                <td>${this.position ?? "-"}</td>
              </tr>
              <tr>
                <td>value</td>
                <td>${this.value ?? "-"}</td>
              </tr>
              <tr>
                <td>hue</td>
                <td>${this.hue ?? "-"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ha-card>
      ${repeat(scrubbers, (scrubber) => {
        const { id, label, ...config } = scrubber;
        return html`
          <ha-card>
            <div class="card-content">
              <label id=${id}>${label}</label>
              <pre>Config: ${JSON.stringify(config)}</pre>
              <ha-control-scrubber
                .value=${this.value}
                class=${ifDefined(config.class)}
                .disabled=${config.disabled ?? false}
                @value-changed=${this.handleValueChanged}
                @slider-moved=${this.handleMoved}
                .label=${label}
                .unit=${config.unit}
              >
              </ha-control-scrubber>
            </div>
          </ha-card>
        `;
      })}
      <ha-card>
        <div class="card-content">
          <label id="scrubber-hue">Hue (wrap)</label>
          <pre>Config: {"wrap":true,"min":0,"max":360}</pre>
          <ha-control-scrubber
            class="hue"
            wrap
            min="0"
            max="360"
            unit="°"
            .value=${this.hue}
            @value-changed=${this.handleHueChanged}
            @slider-moved=${this.handleMoved}
            label="Hue"
          >
          </ha-control-scrubber>
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
    ha-control-scrubber {
      --control-scrubber-background: linear-gradient(
        to right,
        var(--disabled-color),
        var(--primary-color)
      );
    }
    .zoomed {
      --control-scrubber-track-width: 300%;
    }
    .hue {
      --control-scrubber-track-width: 200%;
      --control-scrubber-background: linear-gradient(
        to right,
        hsl(0 100% 50%),
        hsl(60 100% 50%),
        hsl(120 100% 50%),
        hsl(180 100% 50%),
        hsl(240 100% 50%),
        hsl(300 100% 50%),
        hsl(360 100% 50%)
      );
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-control-scrubber": DemoHaControlScrubber;
  }
}
