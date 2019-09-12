import memoizeOne from "memoize-one";
import "../../../../layouts/hass-subpage";
import "../../../../layouts/hass-error-screen";

import "../../../../components/entity/state-badge";
import { compare } from "../../../../common/string/compare";

import "../../devices/ha-device-card";
import "./ha-ce-entities-card";
import { showOptionsFlowDialog } from "../../../../dialogs/config-flow/show-dialog-options-flow";
import { property, LitElement, CSSResult, css, html } from "lit-element";
import { navigate } from "../../../../common/navigate";
import { HomeAssistant } from "../../../../types";
import {
  ConfigEntry,
  deleteConfigEntry,
} from "../../../../data/config_entries";
import { EntityRegistryEntry } from "../../../../data/entity_registry";
import { DeviceRegistryEntry } from "../../../../data/device_registry";
import { AreaRegistryEntry } from "../../../../data/area_registry";
import { fireEvent } from "../../../../common/dom/fire_event";
import { showConfigEntrySystemOptionsDialog } from "../../../../dialogs/config-entry-system-options/show-dialog-config-entry-system-options";
import {
  RowClickedEvent,
  DataTabelColumnContainer,
} from "../../../../components/ha-data-table";

class HaConfigEntryPage extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public narrow!: boolean;
  @property() public configEntryId!: string;
  @property() public configEntries!: ConfigEntry[];
  @property() public entityRegistryEntries!: EntityRegistryEntry[];
  @property() public deviceRegistryEntries!: DeviceRegistryEntry[];
  @property() public areas!: AreaRegistryEntry[];

  private get _configEntry(): ConfigEntry | undefined {
    return this.configEntries
      ? this.configEntries.find(
          (entry) => entry.entry_id === this.configEntryId
        )
      : undefined;
  }

  private _computeConfigEntryDevices = memoizeOne(
    (configEntry: ConfigEntry, devices: DeviceRegistryEntry[]) => {
      if (!devices) {
        return [];
      }
      return devices
        .filter((device) =>
          device.config_entries.includes(configEntry.entry_id)
        )
        .sort(
          (dev1, dev2) =>
            Number(!!dev1.via_device_id) - Number(!!dev2.via_device_id) ||
            compare(dev1.name || "", dev2.name || "")
        );
    }
  );

  private _computeNoDeviceEntities = memoizeOne(
    (configEntry: ConfigEntry, entities: EntityRegistryEntry[]) => {
      if (!entities) {
        return [];
      }
      return entities.filter(
        (ent) => !ent.device_id && ent.config_entry_id === configEntry.entry_id
      );
    }
  );

  private _columns: DataTabelColumnContainer = {
    device_name: {
      title: "Device",
      sortable: true,
      filterable: true,
      direction: "asc",
    },
    manufacturer: {
      title: "Manufacturer",
      sortable: true,
      filterable: true,
    },
    model: {
      title: "Model",
      sortable: true,
      filterable: true,
    },
    area: {
      title: "Area",
      sortable: true,
      filterable: true,
    },
    entities: {
      title: "Entities",
      template: (entities) =>
        entities.map((entity: EntityRegistryEntry) => {
          const stateObj = this.hass.states[entity.entity_id];
          return html`
            <ha-state-icon
              .stateObj=${stateObj}
              style="color: var(--paper-item-body-secondary-color, var(--secondary-text-color))"
            ></ha-state-icon>
          `;
        }),
    },
  };

  protected render() {
    const configEntry = this._configEntry;

    if (!configEntry) {
      return html`
        <hass-error-screen error="Integration not found."></hass-error-screen>
      `;
    }

    const configEntryDevices = this._computeConfigEntryDevices(
      configEntry,
      this.deviceRegistryEntries
    );

    const noDeviceEntities = this._computeNoDeviceEntities(
      configEntry,
      this.entityRegistryEntries
    );

    return html`
      <hass-subpage .header=${configEntry.title}>
        ${configEntry.supports_options
          ? html`
              <paper-icon-button
                slot="toolbar-icon"
                icon="hass:settings"
                @click=${this._showSettings}
              ></paper-icon-button>
            `
          : ""}
        <paper-icon-button
          slot="toolbar-icon"
          icon="hass:message-settings-variant"
          @click=${this._showSystemOptions}
        ></paper-icon-button>
        <paper-icon-button
          slot="toolbar-icon"
          icon="hass:delete"
          @click=${this._removeEntry}
        ></paper-icon-button>

        <div class="content">
          ${configEntryDevices.length === 0 && noDeviceEntities.length === 0
            ? html`
                <p>
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.no_devices"
                  )}
                </p>
              `
            : html`
                <ha-data-table
                  .columns=${this._columns}
                  .data=${configEntryDevices.map((device) => {
                    return {
                      device_name: device.name_by_user || device.name,
                      id: device.id,
                      manufacturer: device.manufacturer,
                      model: device.model,
                      area:
                        !this.areas || !device || !device.area_id
                          ? "No area"
                          : this.areas.find(
                              (area) => area.area_id === device.area_id
                            )!.name,
                      entities: this.entityRegistryEntries.filter(
                        (entity) => entity.device_id === device.id
                      ),
                    };
                  })}
                  @row-click=${this._handleRowClicked}
                ></ha-data-table>
              `}
          ${noDeviceEntities.length > 0
            ? html`
                <ha-ce-entities-card
                  class="card"
                  .heading=${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.no_device"
                  )}
                  .entities=${noDeviceEntities}
                  .hass=${this.hass}
                  .narrow=${this.narrow}
                ></ha-ce-entities-card>
              `
            : ""}
        </div>
      </hass-subpage>
    `;
  }

  private _handleRowClicked(ev: CustomEvent) {
    const deviceId = (ev.detail as RowClickedEvent).id;
    navigate(this, `/config/devices/device/${deviceId}`);
  }

  private _showSettings() {
    showOptionsFlowDialog(this, this._configEntry!);
  }

  private _showSystemOptions() {
    showConfigEntrySystemOptionsDialog(this, {
      entry: this._configEntry!,
    });
  }

  private _removeEntry() {
    if (
      !confirm(
        this.hass.localize(
          "ui.panel.config.integrations.config_entry.delete_confirm"
        )
      )
    ) {
      return;
    }

    deleteConfigEntry(this.hass, this.configEntryId).then((result) => {
      fireEvent(this, "hass-reload-entries");
      if (result.require_restart) {
        alert(
          this.hass.localize(
            "ui.panel.config.integrations.config_entry.restart_confirm"
          )
        );
      }
      navigate(this, "/config/integrations/dashboard", true);
    });
  }

  static get styles(): CSSResult {
    return css`
      .content {
        display: flex;
        flex-wrap: wrap;
        padding: 4px;
        justify-content: center;
      }
      ha-data-table {
        width: 100%;
      }
      .card {
        box-sizing: border-box;
        display: flex;
        flex: 1 0 300px;
        min-width: 0;
        max-width: 500px;
        padding: 8px;
      }
    `;
  }
}

customElements.define("ha-config-entry-page", HaConfigEntryPage);
