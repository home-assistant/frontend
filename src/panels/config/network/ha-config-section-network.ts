import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../layouts/hass-subpage";
import "../../../components/ha-card";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import "../../../components/ha-icon-next";
import type { HomeAssistant, Route } from "../../../types";
import "./ha-config-network";
import "./ha-config-url-form";
import "./supervisor-hostname";
import "./supervisor-network";

const NETWORK_BROWSERS = ["dhcp", "ssdp", "zeroconf"] as const;

@customElement("ha-config-section-network")
class HaConfigSectionNetwork extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

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
          ${NETWORK_BROWSERS.some((component) =>
            isComponentLoaded(this.hass, component)
          )
            ? html`
                <ha-card
                  outlined
                  class="discovery-card"
                  header=${this.hass.localize(
                    "ui.panel.config.network.discovery.title"
                  )}
                >
                  <ha-md-list>
                    ${NETWORK_BROWSERS.map(
                      (domain) => html`
                        <ha-md-list-item type="link" href="/config/${domain}">
                          <div slot="headline">
                            ${this.hass.localize(
                              `ui.panel.config.network.discovery.${domain}`
                            )}
                          </div>
                          <div slot="supporting-text">
                            ${this.hass.localize(
                              `ui.panel.config.network.discovery.${domain}_info`
                            )}
                          </div>
                          <ha-icon-next slot="end"></ha-icon-next>
                        </ha-md-list-item>
                      `
                    )}
                  </ha-md-list>
                </ha-card>
              `
            : ""}
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
    ha-config-network,
    .discovery-card {
      display: block;
      margin: 0 auto;
      margin-bottom: 24px;
      max-width: 600px;
    }
    .discovery-card ha-md-list {
      padding-top: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-section-network": HaConfigSectionNetwork;
  }
}
