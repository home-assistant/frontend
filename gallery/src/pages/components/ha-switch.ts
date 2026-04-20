import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { applyThemesOnElement } from "../../../../src/common/dom/apply_themes_on_element";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-switch";
import type { HomeAssistant } from "../../../../src/types";

@customElement("demo-components-ha-switch")
export class DemoHaSwitch extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;

  protected render(): TemplateResult {
    return html`
      ${["light", "dark"].map(
        (mode) => html`
          <div class=${mode}>
            <ha-card header="ha-switch ${mode}">
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
          </div>
        `
      )}
    `;
  }

  firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    applyThemesOnElement(
      this.shadowRoot!.querySelector(".dark"),
      {
        default_theme: "default",
        default_dark_theme: "default",
        themes: {},
        darkMode: true,
        theme: "default",
      },
      undefined,
      undefined,
      true
    );
  }

  static styles = css`
    :host {
      display: flex;
      justify-content: center;
    }
    .dark,
    .light {
      display: block;
      background-color: var(--primary-background-color);
      padding: 0 50px;
      margin: 16px;
      border-radius: var(--ha-border-radius-md);
    }
    ha-card {
      margin: 24px auto;
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
