import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import type { HomeAssistant, Route } from "../../../types";
import { configSections } from "../ha-panel-config";
import "./ha-config-network";
import "./ha-config-url-form";

@customElement("ha-config-section-network")
class HaConfigSectionNetwork extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        back-path="/config"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${configSections.general}
      >
        <div class="content">
          <ha-config-url-form .hass=${this.hass}></ha-config-url-form>
          <ha-config-network .hass=${this.hass}></ha-config-network>
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
    ha-config-network {
      display: block;
      margin-top: 24px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-section-network": HaConfigSectionNetwork;
  }
}
