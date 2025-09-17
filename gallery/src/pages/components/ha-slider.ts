import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { applyThemesOnElement } from "../../../../src/common/dom/apply_themes_on_element";
import "../../../../src/components/ha-bar";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-spinner";
import "../../../../src/components/ha-slider";
import type { HomeAssistant } from "../../../../src/types";

@customElement("demo-components-ha-slider")
export class DemoHaSlider extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;

  protected render(): TemplateResult {
    return html`
      ${["light", "dark"].map(
        (mode) => html`
          <div class=${mode}>
            <ha-card header="ha-slider ${mode} demo">
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
                  size="small"
                  min="0"
                  max="8"
                  value="4"
                  with-markers
                ></ha-slider>
                <span>Medium</span>
                <ha-slider
                  size="medium"
                  min="0"
                  max="8"
                  value="4"
                  with-markers
                ></ha-slider>
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
      border-radius: 8px;
    }
    ha-card {
      margin: 24px auto;
    }
    .card-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-slider": DemoHaSlider;
  }
}
