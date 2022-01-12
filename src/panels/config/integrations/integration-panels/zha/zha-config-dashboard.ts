import "@material/mwc-button/mwc-button";
import { mdiFolderMultipleOutline, mdiLan, mdiNetwork, mdiPlus } from "@mdi/js";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property } from "lit/decorators";
import { computeRTL } from "../../../../../common/util/compute_rtl";
import "../../../../../components/ha-card";
import "../../../../../components/ha-fab";
import "../../../../../components/ha-icon-next";
import "../../../../../layouts/hass-tabs-subpage";
import type { PageNavigation } from "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../ha-config-section";
import "../../../../../components/ha-form/ha-form";
import {
  fetchZHAConfiguration,
  updateZHAConfiguration,
  ZHAConfiguration,
} from "../../../../../data/zha";

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
  {
    translationKey: "ui.panel.config.zha.visualization.caption",
    path: `/config/zha/visualization`,
    iconPath: mdiLan,
  },
];

@customElement("zha-config-dashboard")
class ZHAConfigDashboard extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property() public configEntryId?: string;

  @property() private _configuration?: ZHAConfiguration;

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    if (this.hass) {
      this.hass.loadBackendTranslation("config_panel", "zha", false);
      this._fetchConfiguration();
    }
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${zhaTabs}
        back-path="/config/integrations"
      >
        <ha-card
          header=${this.hass.localize(
            "ui.panel.config.zha.configuration_page.shortcuts_title"
          )}
        >
          ${this.configEntryId
            ? html`<div class="card-actions">
                <a
                  href=${`/config/devices/dashboard?historyBack=1&config_entry=${this.configEntryId}`}
                >
                  <mwc-button
                    >${this.hass.localize(
                      "ui.panel.config.devices.caption"
                    )}</mwc-button
                  >
                </a>
                <a
                  href=${`/config/entities/dashboard?historyBack=1&config_entry=${this.configEntryId}`}
                >
                  <mwc-button
                    >${this.hass.localize(
                      "ui.panel.config.entities.caption"
                    )}</mwc-button
                  >
                </a>
              </div>`
            : ""}
        </ha-card>
        ${this._configuration
          ? Object.entries(this._configuration.schemas).map(
              ([section, schema]) => html` <ha-card
                header=${this.hass.localize(
                  `component.zha.config_panel.${section}.title`
                )}
              >
                <div class="card-content">
                  <ha-form
                    .schema=${schema}
                    .data=${this._configuration!.data[section]}
                    @value-changed=${this._dataChanged}
                    .section=${section}
                    .computeLabel=${this._computeLabelCallback(
                      this.hass.localize,
                      section
                    )}
                  ></ha-form>
                </div>
              </ha-card>`
            )
          : ""}
        <ha-card>
          <div class="card-actions">
            <mwc-button @click=${this._updateConfiguration}>
              ${this.hass.localize(
                "ui.panel.config.zha.configuration_page.update_button"
              )}
            </mwc-button>
          </div>
        </ha-card>

        <a href="/config/zha/add" slot="fab">
          <ha-fab
            .label=${this.hass.localize("ui.panel.config.zha.add_device")}
            extended
            ?rtl=${computeRTL(this.hass)}
          >
            <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
          </ha-fab>
        </a>
      </hass-tabs-subpage>
    `;
  }

  private async _fetchConfiguration(): Promise<void> {
    this._configuration = await fetchZHAConfiguration(this.hass!);
  }

  private _dataChanged(ev) {
    this._configuration!.data[ev.currentTarget!.section] = ev.detail.value;
  }

  private async _updateConfiguration(): Promise<any> {
    await updateZHAConfiguration(this.hass!, this._configuration!.data);
  }

  private _computeLabelCallback(localize, section: string) {
    // Returns a callback for ha-form to calculate labels per schema object
    return (schema) =>
      localize(`component.zha.config_panel.${section}.${schema.name}`) ||
      schema.name;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-card {
          margin: auto;
          margin-top: 16px;
          max-width: 500px;
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
