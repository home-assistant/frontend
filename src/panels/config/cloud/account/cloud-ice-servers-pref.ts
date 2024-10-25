import { mdiHelpCircle } from "@mdi/js";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-card";
import "../../../../components/ha-switch";
import type { HaSwitch } from "../../../../components/ha-switch";
import { CloudStatusLoggedIn, updateCloudPref } from "../../../../data/cloud";
import type { HomeAssistant } from "../../../../types";

@customElement("cloud-ice-servers-pref")
export class CloudICEServersPref extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public cloudStatus?: CloudStatusLoggedIn;

  protected render() {
    if (!this.cloudStatus) {
      return nothing;
    }

    const { cloud_ice_servers_enabled } = this.cloudStatus.prefs;

    return html`
      <ha-card
        outlined
        header=${this.hass.localize(
          "ui.panel.config.cloud.account.ice_servers.title"
        )}
      >
        <div class="header-actions">
          <a
            href="https://www.nabucasa.com/config/"
            target="_blank"
            rel="noreferrer"
            class="icon-link"
          >
            <ha-icon-button
              .label=${this.hass.localize(
                "ui.panel.config.cloud.account.ice_servers.link_learn_how_it_works"
              )}
              .path=${mdiHelpCircle}
            ></ha-icon-button>
          </a>
          <ha-switch
            .checked=${cloud_ice_servers_enabled}
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
      </ha-card>
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
      alert(err.message);
      toggle.checked = !toggle.checked;
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      a {
        color: var(--primary-color);
      }
      .header-actions {
        position: absolute;
        right: 16px;
        inset-inline-end: 16px;
        inset-inline-start: initial;
        top: 24px;
        display: flex;
        flex-direction: row;
      }
      .header-actions .icon-link {
        margin-top: -16px;
        margin-right: 8px;
        margin-inline-end: 8px;
        margin-inline-start: initial;
        direction: var(--direction);
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-ice-servers-pref": CloudICEServersPref;
  }
}
