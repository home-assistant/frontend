import "@material/mwc-button/mwc-button";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/ha-button";
import "../../../components/ha-card";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";

@customElement("ha-config-network-discovery")
class ConfigNetworkDiscovery extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected render() {
    return isComponentLoaded(this.hass, "zeroconf")
      ? html`
          <ha-card
            outlined
            header=${this.hass.localize(
              "ui.panel.config.network.discovery.zeroconf"
            )}
          >
            <div class="card-content">
              <p>
                ${this.hass.localize(
                  "ui.panel.config.network.discovery.zeroconf_info"
                )}
              </p>
            </div>
            <div class="card-actions">
              <a
                href="/config/zeroconf"
                aria-label=${this.hass.localize(
                  "ui.panel.config.network.discovery.zeroconf_browser"
                )}
              >
                <ha-button>
                  ${this.hass.localize(
                    "ui.panel.config.network.discovery.zeroconf_browser"
                  )}
                </ha-button>
              </a>
            </div>
          </ha-card>
        `
      : "";
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-settings-row {
          padding: 0;
        }
              
        .card-actions {
          display: flex;
          flex-direction: row-reverse;
          justify-content: space-between;
          align-items: center;
        }
      `, // row-reverse so we tab first to "save"
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-network-discovery": ConfigNetworkDiscovery;
  }
}
