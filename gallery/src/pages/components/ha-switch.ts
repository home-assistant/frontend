import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-switch";
import type { HomeAssistant } from "../../../../src/types";
import { THEME_COMPARISON_PANELS } from "../../components/demo-theme-comparison";

@customElement("demo-components-ha-switch")
export class DemoHaSwitch extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;

  protected render(): TemplateResult {
    return html`
      <demo-theme-comparison>
        ${THEME_COMPARISON_PANELS.map(
          ({ slot }) => html`
            <ha-card slot=${slot} header="ha-switch">
              <div class="card-content">
                <div class="row">
                  <span>Unchecked</span>
                  <ha-switch></ha-switch>
                </div>
                <div class="row">
                  <span>Checked</span>
                  <ha-switch checked></ha-switch>
                </div>
                <div class="row">
                  <span>Disabled</span>
                  <ha-switch disabled></ha-switch>
                </div>
                <div class="row">
                  <span>Disabled checked</span>
                  <ha-switch disabled checked></ha-switch>
                </div>
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
      gap: var(--ha-space-4);
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--ha-space-4);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-switch": DemoHaSwitch;
  }
}
