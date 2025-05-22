import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { applyThemesOnElement } from "../../../../src/common/dom/apply_themes_on_element";
import "../../../../src/components/ha-bar";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-spinner";
import type { HomeAssistant } from "../../../../src/types";

@customElement("demo-components-ha-spinner")
export class DemoHaSpinner extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;

  protected render(): TemplateResult {
    return html`
      ${["light", "dark"].map(
        (mode) => html`
          <div class=${mode}>
            <ha-card header="ha-badge ${mode} demo">
              <div class="card-content">
                <ha-spinner></ha-spinner>
                <ha-spinner size="tiny"></ha-spinner>
                <ha-spinner size="small"></ha-spinner>
                <ha-spinner size="medium"></ha-spinner>
                <ha-spinner size="large"></ha-spinner>
                <ha-spinner aria-label="Doing something..."></ha-spinner>
                <ha-spinner .ariaLabel=${"Doing something..."}></ha-spinner>
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
    "demo-components-ha-spinner": DemoHaSpinner;
  }
}
