import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import type { HomeAssistant, Route } from "../../../types";
import { configSections } from "../ha-panel-config";
import "./ha-config-analytics";

@customElement("ha-config-section-analytics")
class HaConfigSectionAnalytics extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.general}
      >
        <div class="content">
          <ha-config-analytics .hass=${this.hass}></ha-config-analytics>
        </div>
      </hass-tabs-subpage>
    `;
  }

  static styles = css`
    .content {
      padding: 28px 20px 0;
      max-width: 1040px;
      margin: 0 auto;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-section-analytics": HaConfigSectionAnalytics;
  }
}
