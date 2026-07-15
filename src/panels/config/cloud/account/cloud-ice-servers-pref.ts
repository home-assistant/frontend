import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-switch";
import type { HaSwitch } from "../../../../components/ha-switch";
import type { CloudStatusLoggedIn } from "../../../../data/cloud";
import { updateCloudPref } from "../../../../data/cloud";
import "../../../../layouts/hass-subpage";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showToast } from "../../../../util/toast";
import { cloudSubpageStyle } from "./cloud-subpage-style";

@customElement("cloud-ice-servers-pref")
export class CloudICEServersPref extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public cloudStatus?: CloudStatusLoggedIn;

  @property({ type: Boolean }) public narrow = false;

  protected render() {
    if (!this.cloudStatus) {
      return nothing;
    }

    const { cloud_ice_servers_enabled: cloudICEServersEnabled } =
      this.cloudStatus.prefs;

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize(
          "ui.panel.config.cloud.account.ice_servers.title"
        )}
        back-path="/config/cloud/account"
      >
        <div class="content">
          <ha-card
            outlined
            header=${this.hass.localize(
              "ui.panel.config.cloud.account.ice_servers.title"
            )}
          >
            <div class="header-actions">
              <ha-switch
                .checked=${cloudICEServersEnabled}
                @change=${this._toggleCloudICEServersEnabledChanged}
              ></ha-switch>
            </div>

            <div class="card-content">
              <p>
                ${this.hass.localize(
                  "ui.panel.config.cloud.account.ice_servers.info"
                )}
              </p>
            </div>
            <div class="card-actions">
              <ha-button
                appearance="plain"
                href="https://www.nabucasa.com/config/webrtc/"
                target="_blank"
                rel="noreferrer"
              >
                ${this.hass.localize(
                  "ui.panel.config.cloud.account.ice_servers.link_learn_more"
                )}
              </ha-button>
            </div>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private async _toggleCloudICEServersEnabledChanged(ev) {
    const toggle = ev.target as HaSwitch;

    try {
      await updateCloudPref(this.hass, {
        cloud_ice_servers_enabled: toggle.checked,
      });
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err: any) {
      showToast(this, { message: err.message });
      toggle.checked = !toggle.checked;
    }
  }

  static styles = [
    haStyle,
    cloudSubpageStyle,
    css`
      .header-actions {
        position: absolute;
        right: var(--ha-space-4);
        inset-inline-end: var(--ha-space-4);
        inset-inline-start: initial;
        top: var(--ha-space-6);
        display: flex;
        flex-direction: row;
      }
      .card-content p {
        color: var(--secondary-text-color);
      }
      .card-actions {
        display: flex;
        justify-content: flex-end;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-ice-servers-pref": CloudICEServersPref;
  }
}
