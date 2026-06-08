import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../src/components/ha-bar";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-spinner";
import "../../../../src/components/ha-slider";
import type { HomeAssistant } from "../../../../src/types";
import { THEME_COMPARISON_PANELS } from "../../components/demo-theme-comparison";

@customElement("demo-components-ha-slider")
export class DemoHaSlider extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;

  protected render(): TemplateResult {
    return html`
      <demo-theme-comparison>
        ${THEME_COMPARISON_PANELS.map(
          ({ slot }) => html`
            <ha-card slot=${slot} header="ha-slider demo">
              <div class="card-content">
                <span>Default (disabled)</span>
                <ha-slider
                  disabled
                  min="0"
                  max="8"
                  value="4"
                  with-markers
                ></ha-slider>
                <span>Small</span>
                <ha-slider
                  size="s"
                  min="0"
                  max="8"
                  value="4"
                  with-markers
                ></ha-slider>
                <span>Medium</span>
                <ha-slider
                  size="m"
                  min="0"
                  max="8"
                  value="4"
                  with-markers
                ></ha-slider>
              </div>
            </ha-card>
          `
        )}
      </demo-theme-comparison>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
    ha-card {
      margin: 0;
      width: 100%;
    }
    .card-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--ha-space-6);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-slider": DemoHaSlider;
  }
}
