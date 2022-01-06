import { html, css, LitElement, TemplateResult } from "lit";
import { customElement } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import "../../../../src/components/ha-bar";
import "../../../../src/components/ha-card";

const bars: {
  min?: number;
  max?: number;
  value: number;
  warning?: number;
  error?: number;
}[] = [
  {
    value: 33,
  },
  {
    value: 150,
  },
  {
    min: -10,
    value: 0,
  },
  {
    value: 80,
  },
  {
    value: 200,
    max: 13,
  },
  {
    value: 4,
    min: 13,
  },
];

@customElement("demo-components-ha-bar")
export class DemoHaBar extends LitElement {
  protected render(): TemplateResult {
    return html`
      ${bars
        .map((bar) => ({ min: 0, max: 100, warning: 70, error: 90, ...bar }))
        .map(
          (bar) => html`
            <ha-card>
              <div class="card-content">
                <pre>Config: ${JSON.stringify(bar)}</pre>
                <ha-bar
                  class=${classMap({
                    warning: bar.value > bar.warning,
                    error: bar.value > bar.error,
                  })}
                  .min=${bar.min}
                  .max=${bar.max}
                  .value=${bar.value}
                >
                </ha-bar>
              </div>
            </ha-card>
          `
        )}
    `;
  }

  static get styles() {
    return css`
      ha-card {
        max-width: 600px;
        margin: 24px auto;
      }
      .warning {
        --ha-bar-primary-color: var(--warning-color);
      }
      .error {
        --ha-bar-primary-color: var(--error-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-bar": DemoHaBar;
  }
}
