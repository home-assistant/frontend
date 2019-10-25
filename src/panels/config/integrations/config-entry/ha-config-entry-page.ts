import memoizeOne from "memoize-one";
import "../../../../layouts/hass-subpage";
import "../../../../layouts/hass-error-screen";

import "../../devices/ha-devices-data-table";
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
import { showConfirmationDialog } from "../../../../dialogs/confirmation/show-dialog-confirmation";

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
      return devices.filter((device) =>
        device.config_entries.includes(configEntry.entry_id)
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
        <hass-error-screen
          error="${this.hass.localize(
            "ui.panel.config.integrations.integration_not_found"
          )}"
        ></hass-error-screen>
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
                title=${this.hass.localize(
                  "ui.panel.config.integrations.config_entry.settings_button",
                  "integration",
                  configEntry.title
                )}
              ></paper-icon-button>
            `
          : ""}
        <paper-icon-button
          slot="toolbar-icon"
          icon="hass:message-settings-variant"
          title=${this.hass.localize(
            "ui.panel.config.integrations.config_entry.system_options_button",
            "integration",
            configEntry.title
          )}
          @click=${this._showSystemOptions}
        ></paper-icon-button>
        <paper-icon-button
          slot="toolbar-icon"
          icon="hass:delete"
          title=${this.hass.localize(
            "ui.panel.config.integrations.config_entry.delete_button",
            "integration",
            configEntry.title
          )}
          @click=${this._confirmRemoveEntry}
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
                <ha-devices-data-table
                  .hass=${this.hass}
                  .narrow=${this.narrow}
                  .devices=${configEntryDevices}
                  .entries=${this.configEntries}
                  .entities=${this.entityRegistryEntries}
                  .areas=${this.areas}
                ></ha-devices-data-table>
              `}
          ${noDeviceEntities.length > 0
            ? html`
                <ha-ce-entities-card
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

  private _confirmRemoveEntry() {
    showConfirmationDialog(this, {
      text: this.hass.localize(
        "ui.panel.config.integrations.config_entry.delete_confirm"
      ),
      confirm: () => this._removeEntry(),
    });
  }

  private _removeEntry() {
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
        padding: 4px;
      }
      p {
        text-align: center;
      }
      ha-devices-data-table {
        width: 100%;
      }
    `;
  }
}

customElements.define("ha-config-entry-page", HaConfigEntryPage);
