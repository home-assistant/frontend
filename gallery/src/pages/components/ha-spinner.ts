import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../src/components/ha-bar";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-spinner";
import type { HomeAssistant } from "../../../../src/types";
import { THEME_COMPARISON_PANELS } from "../../components/demo-theme-comparison";

@customElement("demo-components-ha-spinner")
export class DemoHaSpinner extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;

  protected render(): TemplateResult {
    return html`
      <demo-theme-comparison>
        ${THEME_COMPARISON_PANELS.map(
          ({ slot }) => html`
            <ha-card slot=${slot}>
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
    "demo-components-ha-spinner": DemoHaSpinner;
  }
}
