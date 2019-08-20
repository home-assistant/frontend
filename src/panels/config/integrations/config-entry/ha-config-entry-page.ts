import memoizeOne from "memoize-one";
import "../../../../layouts/hass-subpage";
import "../../../../layouts/hass-error-screen";

import "../../../../components/entity/state-badge";
import { compare } from "../../../../common/string/compare";

import "./ha-device-card";
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
            : ""}
          ${configEntryDevices.map(
            (device) => html`
              <ha-device-card
                class="card"
                .hass=${this.hass}
                .areas=${this.areas}
                .devices=${this.deviceRegistryEntries}
                .device=${device}
                .entities=${this.entityRegistryEntries}
                .narrow=${this.narrow}
              ></ha-device-card>
            `
          )}
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
