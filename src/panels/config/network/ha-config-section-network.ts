import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../layouts/hass-subpage";
import type { HomeAssistant, Route } from "../../../types";
import "./ha-config-network";
import "./ha-config-url-form";
import "./supervisor-hostname";
import "./supervisor-network";

@customElement("ha-config-section-network")
class HaConfigSectionNetwork extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        back-path="/config/system"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.network.caption")}
      >
        <div class="content">
          ${isComponentLoaded(this.hass, "hassio")
            ? html`<supervisor-hostname
                  .hass=${this.hass}
                  .narrow=${this.narrow}
                ></supervisor-hostname>
                <supervisor-network .hass=${this.hass}></supervisor-network>`
            : ""}
          <ha-config-url-form .hass=${this.hass}></ha-config-url-form>
          <ha-config-network .hass=${this.hass}></ha-config-network>
        </div>
      </hass-subpage>
    `;
  }

  static styles = css`
    .content {
      padding: 28px 20px 0;
      max-width: 1040px;
      margin: 0 auto;
    }
    supervisor-hostname,
    supervisor-network,
    ha-config-url-form,
    ha-config-network {
      display: block;
      margin: 0 auto;
      margin-bottom: 24px;
      max-width: 600px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-section-network": HaConfigSectionNetwork;
  }
}
