import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import "@material/mwc-fab";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../ha-config-section";
import { mdiNetwork, mdiFolderMultipleOutline, mdiPlus } from "@mdi/js";
import "../../../../../layouts/hass-tabs-subpage";
import type { PageNavigation } from "../../../../../layouts/hass-tabs-subpage";
import { computeRTL } from "../../../../../common/util/compute_rtl";

export const zhaTabs: PageNavigation[] = [
  {
    translationKey: "ui.panel.config.zha.network.caption",
    path: `/config/zha/dashboard`,
    iconPath: mdiNetwork,
  },
  {
    translationKey: "ui.panel.config.zha.groups.caption",
    path: `/config/zha/groups`,
    iconPath: mdiFolderMultipleOutline,
  },
];

@customElement("zha-config-dashboard")
class ZHAConfigDashboard extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property() public configEntryId?: string;

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${zhaTabs}
        back-path="/config/integrations"
      >
        <ha-card header="Zigbee Network">
          <div class="card-content">
            Network info/settings for specific config entry
          </div>
          ${this.configEntryId
            ? html`<div class="card-actions">
                <a
                  href="${`/config/devices/dashboard?historyBack=1&config_entry=${this.configEntryId}`}"
                >
                  <mwc-button>Devices</mwc-button>
                </a>
                <a
                  href="${`/config/entities/dashboard?historyBack=1&config_entry=${this.configEntryId}`}"
                >
                  <mwc-button>Entities</mwc-button>
                </a>
              </div>`
            : ""}
        </ha-card>
        <a href="/config/zha/add">
          <mwc-fab
            ?is-wide=${this.isWide}
            ?narrow=${this.narrow}
            title=${this.hass.localize("ui.panel.config.zha.add_device")}
            ?rtl=${computeRTL(this.hass)}
          >
            <ha-svg-icon slot="icon" path=${mdiPlus}></ha-svg-icon>
          </mwc-fab>
        </a>
      </hass-tabs-subpage>
    `;
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        ha-card {
          margin: auto;
          margin-top: 16px;
          max-width: 500px;
        }
        mwc-fab {
          position: fixed;
          bottom: 16px;
          right: 16px;
          z-index: 1;
        }

        mwc-fab[is-wide] {
          bottom: 24px;
          right: 24px;
        }
        mwc-fab[narrow] {
          bottom: 84px;
        }
        mwc-fab[rtl] {
          right: auto;
          left: 16px;
        }

        mwc-fab[rtl][is-wide] {
          bottom: 24px;
          right: auto;
          left: 24px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-config-dashboard": ZHAConfigDashboard;
  }
}
