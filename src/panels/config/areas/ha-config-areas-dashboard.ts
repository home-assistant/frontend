import { mdiHelpCircle, mdiPlus } from "@mdi/js";
import {
  CSSResultGroup,
  LitElement,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { formatListWithAnds } from "../../../common/string/format-list";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import {
  AreaRegistryEntry,
  createAreaRegistryEntry,
} from "../../../data/area_registry";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage";
import { HomeAssistant, Route } from "../../../types";
import "../ha-config-section";
import { configSections } from "../ha-panel-config";
import {
  loadAreaRegistryDetailDialog,
  showAreaRegistryDetailDialog,
} from "./show-dialog-area-registry-detail";

@customElement("ha-config-areas-dashboard")
export class HaConfigAreasDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  private _processAreas = memoizeOne(
    (
      areas: HomeAssistant["areas"],
      devices: HomeAssistant["devices"],
      entities: HomeAssistant["entities"]
    ) => {
      const processArea = (area: AreaRegistryEntry) => {
        let noDevicesInArea = 0;
        let noServicesInArea = 0;
        let noEntitiesInArea = 0;

        for (const device of Object.values(devices)) {
          if (device.area_id === area.area_id) {
            if (device.entry_type === "service") {
              noServicesInArea++;
            } else {
              noDevicesInArea++;
            }
          }
        }

        for (const entity of Object.values(entities)) {
          if (entity.area_id === area.area_id) {
            noEntitiesInArea++;
          }
        }

        return {
          ...area,
          devices: noDevicesInArea,
          services: noServicesInArea,
          entities: noEntitiesInArea,
        };
      };

      return Object.values(areas).map(processArea);
    }
  );

  protected render(): TemplateResult {
    const areas =
      !this.hass.areas || !this.hass.devices || !this.hass.entities
        ? undefined
        : this._processAreas(
            this.hass.areas,
            this.hass.devices,
            this.hass.entities
          );

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .isWide=${this.isWide}
        back-path="/config"
        .tabs=${configSections.areas}
        .route=${this.route}
      >
        <ha-icon-button
          slot="toolbar-icon"
          .label=${this.hass.localize("ui.common.help")}
          .path=${mdiHelpCircle}
          @click=${this._showHelp}
        ></ha-icon-button>
        <div class="container">
          ${areas?.length
            ? html`<div class="areas">
                ${areas.map((area) => this._renderArea(area))}
              </div>`
            : nothing}
        </div>
        <ha-fab
          slot="fab"
          .label=${this.hass.localize(
            "ui.panel.config.areas.picker.create_area"
          )}
          extended
          @click=${this._createArea}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage>
    `;
  }

  private _renderArea(area) {
    return html`<a href=${`/config/areas/area/${area.area_id}`}>
      <ha-card outlined>
        <div
          style=${styleMap({
            backgroundImage: area.picture ? `url(${area.picture})` : undefined,
          })}
          class="picture ${!area.picture ? "placeholder" : ""}"
        >
          ${!area.picture && area.icon
            ? html`<ha-icon .icon=${area.icon}></ha-icon>`
            : ""}
        </div>
        <h1 class="card-header">${area.name}</h1>
        <div class="card-content">
          <div>
            ${formatListWithAnds(
              this.hass.locale,
              [
                area.devices &&
                  this.hass.localize(
                    "ui.panel.config.integrations.config_entry.devices",
                    { count: area.devices }
                  ),
                area.services &&
                  this.hass.localize(
                    "ui.panel.config.integrations.config_entry.services",
                    { count: area.services }
                  ),
                area.entities &&
                  this.hass.localize(
                    "ui.panel.config.integrations.config_entry.entities",
                    { count: area.entities }
                  ),
              ].filter((v): v is string => Boolean(v))
            )}
          </div>
        </div>
      </ha-card>
    </a>`;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    loadAreaRegistryDetailDialog();
  }

  private _createArea() {
    this._openAreaDialog();
  }

  private _showHelp() {
    showAlertDialog(this, {
      title: this.hass.localize("ui.panel.config.areas.caption"),
      text: html`
        ${this.hass.localize("ui.panel.config.areas.picker.introduction")}
        <p>
          ${this.hass.localize("ui.panel.config.areas.picker.introduction2")}
        </p>
        <a href="/config/integrations/dashboard">
          ${this.hass.localize(
            "ui.panel.config.areas.picker.integrations_page"
          )}
        </a>
      `,
    });
  }

  private _openAreaDialog(entry?: AreaRegistryEntry) {
    showAreaRegistryDetailDialog(this, {
      entry,
      createEntry: async (values) =>
        createAreaRegistryEntry(this.hass!, values),
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      .container {
        padding: 8px 16px 16px;
        margin: 0 auto 64px auto;
      }
      .areas {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        grid-gap: 16px 16px;
        max-width: 2000px;
        margin-bottom: 16px;
      }
      .areas > * {
        max-width: 500px;
      }
      ha-card {
        overflow: hidden;
      }
      a {
        text-decoration: none;
      }
      h1 {
        padding-bottom: 0;
      }
      .picture {
        height: 150px;
        width: 100%;
        background-size: cover;
        background-position: center;
        position: relative;
      }
      .placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        --mdc-icon-size: 48px;
      }
      .picture.placeholder::before {
        position: absolute;
        content: "";
        width: 100%;
        height: 100%;
        background-color: var(--sidebar-selected-icon-color);
        opacity: 0.12;
      }
      .card-content {
        min-height: 16px;
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-areas-dashboard": HaConfigAreasDashboard;
  }
}
