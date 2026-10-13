import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import "../../../components/item/ha-list-item-button";
import "../../../components/list/ha-list-nav";
import "../../../layouts/hass-subpage";
import type { HomeAssistant, Route } from "../../../types";
import "./ha-config-http-form";
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
          ${
            isComponentLoaded(this.hass.config, "hassio")
              ? html`<supervisor-hostname
                    .hass=${this.hass}
                    .narrow=${this.narrow}
                  ></supervisor-hostname>
                  <supervisor-network .hass=${this.hass}></supervisor-network>`
              : ""
          }
          <ha-config-url-form .hass=${this.hass}></ha-config-url-form>
          <ha-config-http-form .hass=${this.hass}></ha-config-http-form>
          <ha-config-network .hass=${this.hass}></ha-config-network>
          ${
            NETWORK_BROWSERS.some((component) =>
              isComponentLoaded(this.hass.config, component)
            )
              ? html`
                  <ha-card
                    outlined
                    class="discovery-card"
                    header=${this.hass.localize(
                      "ui.panel.config.network.discovery.title"
                    )}
                  >
                    <ha-list-nav
                      .ariaLabel=${this.hass.localize(
                        "ui.panel.config.network.discovery.title"
                      )}
                    >
                      ${NETWORK_BROWSERS.map(
                        (domain) => html`
                          <ha-list-item-button href="/config/${domain}">
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
                          </ha-list-item-button>
                        `
                      )}
                    </ha-list-nav>
                  </ha-card>
                `
              : ""
          }
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
    ha-config-http-form,
    ha-config-network,
    .discovery-card {
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
