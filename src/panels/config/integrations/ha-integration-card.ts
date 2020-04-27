import {
  customElement,
  LitElement,
  property,
  html,
  CSSResult,
  css,
} from "lit-element";
import { HomeAssistant } from "../../../types";
import { ConfigEntryExtended } from "./ha-config-integrations";
import { domainToName } from "../../../data/integration";
import {
  ConfigEntry,
  updateConfigEntry,
  deleteConfigEntry,
} from "../../../data/config_entries";
import { EntityRegistryEntry } from "../../../data/entity_registry";
import { DeviceRegistryEntry } from "../../../data/device_registry";
import { showOptionsFlowDialog } from "../../../dialogs/config-flow/show-dialog-options-flow";
import { showConfigEntrySystemOptionsDialog } from "../../../dialogs/config-entry-system-options/show-dialog-config-entry-system-options";
import {
  showPromptDialog,
  showConfirmationDialog,
  showAlertDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../resources/styles";
import "../../../components/ha-icon-prev";
import "../../../components/ha-icon-next";

@customElement("ha-integration-card")
class HaIntegrationCard extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public domain!: string;

  @property() public items!: ConfigEntryExtended[];

  @property() public entityRegistryEntries!: EntityRegistryEntry[];

  @property() public deviceRegistryEntries!: DeviceRegistryEntry[];

  @property() private _selectedConfigEntry?: ConfigEntryExtended;

  protected render() {
    return this.items.length === 1
      ? this._renderSingleEntry(this.items[0])
      : this._selectedConfigEntry
      ? this._renderSingleEntry(this._selectedConfigEntry)
      : this._renderGroupedIntegration();
  }

  private _renderGroupedIntegration() {
    return html`
      <ha-card class="group">
        <div class="group-header">
          <img
            src="https://brands.home-assistant.io/${this.domain}/icon.png"
            referrerpolicy="no-referrer"
            @error=${this._onImageError}
            @load=${this._onImageLoad}
          />
          <h1>
            ${domainToName(this.hass.localize, this.domain)}
          </h1>
        </div>
        <paper-listbox>
          ${this.items.map(
            (item) =>
              html`<paper-item .entry=${item} @click=${this._selectConfigEntry}
                ><paper-item-body>${item.title}</paper-item-body
                ><ha-icon-next></ha-icon-next
              ></paper-item>`
          )}
        </paper-listbox>
      </ha-card>
    `;
  }

  private _renderSingleEntry(item: ConfigEntryExtended) {
    const devices = this._getDevices(item);
    const entities = this._getEntities(item);
    return html`
      <ha-card
        class="single integration"
        .configEntry=${item}
        .id=${item.entry_id}
      >
        ${this.items.length > 1
          ? html`<ha-icon-prev @click=${this._back}></ha-icon-prev>`
          : ""}
        <div class="card-content">
          <div class="image">
            <img
              src="https://brands.home-assistant.io/${item.domain}/logo.png"
              referrerpolicy="no-referrer"
              @error=${this._onImageError}
              @load=${this._onImageLoad}
            />
          </div>
          <h1>
            ${item.localized_domain_name}
          </h1>
          <h2>
            ${item.localized_domain_name === item.title
              ? html`&nbsp;`
              : item.title}
          </h2>
          ${devices.length || entities.length
            ? html`
                <div>
                  ${devices.length
                    ? html`
                        <a
                          href=${`/config/devices/dashboard?historyBack=1&config_entry=${item.entry_id}`}
                          >${this.hass.localize(
                            "ui.panel.config.integrations.config_entry.devices",
                            "count",
                            devices.length
                          )}</a
                        >
                      `
                    : ""}
                  ${devices.length && entities.length ? "and" : ""}
                  ${entities.length
                    ? html`
                        <a
                          href=${`/config/entities?historyBack=1&config_entry=${item.entry_id}`}
                          >${this.hass.localize(
                            "ui.panel.config.integrations.config_entry.entities",
                            "count",
                            entities.length
                          )}</a
                        >
                      `
                    : ""}
                </div>
              `
            : ""}
        </div>
        <div class="card-actions">
          <div>
            <mwc-button @click=${this._editEntryName}
              >${this.hass.localize(
                "ui.panel.config.integrations.config_entry.rename"
              )}</mwc-button
            >
            ${item.supports_options
              ? html`
                  <mwc-button @click=${this._showOptions}
                    >${this.hass.localize(
                      "ui.panel.config.integrations.config_entry.options"
                    )}</mwc-button
                  >
                `
              : ""}
          </div>
          <paper-menu-button
            horizontal-align="right"
            vertical-align="top"
            vertical-offset="40"
            close-on-activate
          >
            <paper-icon-button
              icon="hass:dots-vertical"
              slot="dropdown-trigger"
              aria-label=${this.hass!.localize(
                "ui.panel.lovelace.editor.edit_card.options"
              )}
            ></paper-icon-button>
            <paper-listbox slot="dropdown-content">
              <paper-item @tap=${this._showSystemOptions}>
                ${this.hass.localize(
                  "ui.panel.config.integrations.config_entry.system_options"
                )}</paper-item
              >
              <paper-item class="warning" @tap=${this._removeIntegration}>
                ${this.hass.localize(
                  "ui.panel.config.integrations.config_entry.delete"
                )}</paper-item
              >
            </paper-listbox>
          </paper-menu-button>
        </div>
      </ha-card>
    `;
  }

  private _selectConfigEntry(ev: Event) {
    this._selectedConfigEntry = (ev.currentTarget as any).entry;
  }

  private _back() {
    this._selectedConfigEntry = undefined;
  }

  private _getEntities(configEntry: ConfigEntry): EntityRegistryEntry[] {
    if (!this.entityRegistryEntries) {
      return [];
    }
    return this.entityRegistryEntries.filter(
      (entity) => entity.config_entry_id === configEntry.entry_id
    );
  }

  private _getDevices(configEntry: ConfigEntry): DeviceRegistryEntry[] {
    if (!this.deviceRegistryEntries) {
      return [];
    }
    return this.deviceRegistryEntries.filter((device) =>
      device.config_entries.includes(configEntry.entry_id)
    );
  }

  private _onImageLoad(ev) {
    ev.target.style.visibility = "initial";
  }

  private _onImageError(ev) {
    ev.target.style.visibility = "hidden";
  }

  private _showOptions(ev) {
    showOptionsFlowDialog(this, ev.target.closest("ha-card").configEntry);
  }

  private _showSystemOptions(ev) {
    showConfigEntrySystemOptionsDialog(this, {
      entry: ev.target.closest("ha-card").configEntry,
    });
  }

  private async _editEntryName(ev) {
    const configEntry = ev.target.closest("ha-card").configEntry;
    const newName = await showPromptDialog(this, {
      title: this.hass.localize("ui.panel.config.integrations.rename_dialog"),
      defaultValue: configEntry.title,
      inputLabel: this.hass.localize(
        "ui.panel.config.integrations.rename_input_label"
      ),
    });
    if (newName === null) {
      return;
    }
    const newEntry = await updateConfigEntry(this.hass, configEntry.entry_id, {
      title: newName,
    });
    //this._configEntries = this._configEntries!.map((entry) =>
    //  entry.entry_id === newEntry.entry_id ? newEntry : entry
    //);
  }

  private async _removeIntegration(ev) {
    const entryId = ev.target.closest("ha-card").configEntry.entry_id;

    const confirmed = await showConfirmationDialog(this, {
      text: this.hass.localize(
        "ui.panel.config.integrations.config_entry.delete_confirm"
      ),
    });

    if (!confirmed) {
      return;
    }
    deleteConfigEntry(this.hass, entryId).then((result) => {
      //this._configEntries = this._configEntries.filter(
      //  (entry) => entry.entry_id !== entryId
      //);

      if (result.require_restart) {
        showAlertDialog(this, {
          text: this.hass.localize(
            "ui.panel.config.integrations.config_entry.restart_confirm"
          ),
        });
      }
    });
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        :host {
          max-width: 500px;
        }
        ha-card {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        ha-card.single {
          justify-content: space-between;
        }
        ha-card.highlight {
          border: 1px solid var(--accent-color);
        }
        .card-content {
          padding: 16px;
          text-align: center;
        }
        ha-card.integration .card-content {
          padding-bottom: 3px;
        }
        .card-actions {
          border-top: none;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-right: 5px;
        }
        .group-header {
          display: flex;
          align-items: center;
          height: 40px;
          padding: 16px 16px 8px 16px;
          vertical-align: middle;
        }
        .group-header h1 {
          margin: 0;
        }
        .group-header img {
          margin-right: 8px;
        }
        .image {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 60px;
          margin-bottom: 16px;
          vertical-align: middle;
        }
        img {
          max-height: 100%;
          max-width: 90%;
        }

        .none-found {
          margin: auto;
          text-align: center;
        }
        a {
          color: var(--primary-color);
        }
        h1 {
          margin-bottom: 0;
        }
        h2 {
          margin-top: 0;
        }
        paper-menu-button {
          color: var(--secondary-text-color);
          padding: 0;
        }
        @media (min-width: 563px) {
          paper-listbox {
            max-height: 150px;
            overflow: auto;
          }
        }
        paper-item {
          cursor: pointer;
          min-height: 35px;
        }
        ha-icon-prev {
          position: absolute;
          padding: 8px;
          background: #ffffffe0;
          border-radius: 50%;
          margin: 8px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-integration-card": HaIntegrationCard;
  }
}
