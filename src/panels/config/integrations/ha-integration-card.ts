import {
  customElement,
  LitElement,
  property,
  html,
  CSSResult,
  css,
  TemplateResult,
} from "lit-element";
import { HomeAssistant } from "../../../types";
import { ConfigEntryExtended } from "./ha-config-integrations";
import { domainToName, IntegrationManifest } from "../../../data/integration";
import {
  ConfigEntry,
  updateConfigEntry,
  deleteConfigEntry,
  reloadConfigEntry,
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
import "../../../components/ha-icon-next";
import { fireEvent } from "../../../common/dom/fire_event";
import { mdiDotsVertical, mdiOpenInNew } from "@mdi/js";
import type { RequestSelectedDetail } from "@material/mwc-list/mwc-list-item";
import { shouldHandleRequestSelectedEvent } from "../../../common/mwc/handle-request-selected-event";
import { brandsUrl } from "../../../util/brands-url";

export interface ConfigEntryUpdatedEvent {
  entry: ConfigEntry;
}

export interface ConfigEntryRemovedEvent {
  entryId: string;
}

declare global {
  // for fire event
  interface HASSDomEvents {
    "entry-updated": ConfigEntryUpdatedEvent;
    "entry-removed": ConfigEntryRemovedEvent;
  }
}

const integrationsWithPanel = {
  mqtt: {
    buttonLocalizeKey: "ui.panel.config.mqtt.button",
    path: "/config/mqtt",
  },
  zha: {
    buttonLocalizeKey: "ui.panel.config.zha.button",
    path: "/config/zha/dashboard",
  },
  ozw: {
    buttonLocalizeKey: "ui.panel.config.ozw.button",
    path: "/config/ozw/dashboard",
  },
  zwave: {
    buttonLocalizeKey: "ui.panel.config.zwave.button",
    path: "/config/zwave",
  },
};

@customElement("ha-integration-card")
export class HaIntegrationCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public domain!: string;

  @property() public items!: ConfigEntryExtended[];

  @property() public manifest!: IntegrationManifest;

  @property() public entityRegistryEntries!: EntityRegistryEntry[];

  @property() public deviceRegistryEntries!: DeviceRegistryEntry[];

  @property() public selectedConfigEntryId?: string;

  firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
  }

  protected render(): TemplateResult {
    if (this.items.length === 1) {
      return this._renderSingleEntry(this.items[0]);
    }
    if (this.selectedConfigEntryId) {
      const configEntry = this.items.find(
        (entry) => entry.entry_id === this.selectedConfigEntryId
      );
      if (configEntry) {
        return this._renderSingleEntry(configEntry);
      }
    }
    return this._renderGroupedIntegration();
  }

  private _renderGroupedIntegration(): TemplateResult {
    return html`
      <ha-card outlined class="group">
        <div class="group-header">
          <img
            src=${brandsUrl(this.domain, "icon")}
            referrerpolicy="no-referrer"
            @error=${this._onImageError}
            @load=${this._onImageLoad}
          />
          <h2>
            ${domainToName(this.hass.localize, this.domain)}
          </h2>
        </div>
        <paper-listbox>
          ${this.items.map(
            (item) =>
              html`<paper-item
                .entryId=${item.entry_id}
                @click=${this._selectConfigEntry}
                ><paper-item-body
                  >${item.title ||
                  this.hass.localize(
                    "ui.panel.config.integrations.config_entry.unnamed_entry"
                  )}</paper-item-body
                ><ha-icon-next></ha-icon-next
              ></paper-item>`
          )}
        </paper-listbox>
      </ha-card>
    `;
  }

  private _renderSingleEntry(item: ConfigEntryExtended): TemplateResult {
    const devices = this._getDevices(item);
    const services = this._getServices(item);
    const entities = this._getEntities(item);

    return html`
      <ha-card
        outlined
        class="single integration"
        .configEntry=${item}
        .id=${item.entry_id}
      >
        ${this.items.length > 1
          ? html`<ha-icon-button
              class="back-btn"
              icon="hass:chevron-left"
              @click=${this._back}
            ></ha-icon-button>`
          : ""}
        <div class="card-content">
          <div class="image">
            <img
              src=${brandsUrl(item.domain, "logo")}
              referrerpolicy="no-referrer"
              @error=${this._onImageError}
              @load=${this._onImageLoad}
            />
          </div>
          <h2>
            ${item.localized_domain_name}
          </h2>
          <h3>
            ${item.localized_domain_name === item.title ? "" : item.title}
          </h3>
          ${devices.length || services.length || entities.length
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
                        >${services.length ? "," : ""}
                      `
                    : ""}
                  ${services.length
                    ? html`
                        <a
                          href=${`/config/devices/dashboard?historyBack=1&config_entry=${item.entry_id}`}
                          >${this.hass.localize(
                            "ui.panel.config.integrations.config_entry.services",
                            "count",
                            services.length
                          )}</a
                        >
                      `
                    : ""}
                  ${(devices.length || services.length) && entities.length
                    ? this.hass.localize("ui.common.and")
                    : ""}
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
            ${item.domain in integrationsWithPanel
              ? html`<a
                  href=${`${
                    integrationsWithPanel[item.domain].path
                  }?config_entry=${item.entry_id}`}
                  ><mwc-button>
                    ${this.hass.localize(
                      integrationsWithPanel[item.domain].buttonLocalizeKey
                    )}
                  </mwc-button></a
                >`
              : item.supports_options
              ? html`
                  <mwc-button @click=${this._showOptions}>
                    ${this.hass.localize(
                      "ui.panel.config.integrations.config_entry.options"
                    )}
                  </mwc-button>
                `
              : ""}
          </div>
          <ha-button-menu corner="BOTTOM_START">
            <mwc-icon-button
              .title=${this.hass.localize("ui.common.menu")}
              .label=${this.hass.localize("ui.common.overflow_menu")}
              slot="trigger"
            >
              <ha-svg-icon .path=${mdiDotsVertical}></ha-svg-icon>
            </mwc-icon-button>
            <mwc-list-item @request-selected="${this._handleSystemOptions}">
              ${this.hass.localize(
                "ui.panel.config.integrations.config_entry.system_options"
              )}
            </mwc-list-item>
            ${!this.manifest
              ? ""
              : html`
                  <a
                    href=${this.manifest.documentation}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <mwc-list-item hasMeta>
                      ${this.hass.localize(
                        "ui.panel.config.integrations.config_entry.documentation"
                      )}<ha-svg-icon
                        slot="meta"
                        .path=${mdiOpenInNew}
                      ></ha-svg-icon>
                    </mwc-list-item>
                  </a>
                `}
            ${item.state === "loaded" && item.supports_unload
              ? html`<mwc-list-item @request-selected="${this._handleReload}">
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.reload"
                  )}
                </mwc-list-item>`
              : ""}
            <mwc-list-item
              class="warning"
              @request-selected="${this._handleDelete}"
            >
              ${this.hass.localize(
                "ui.panel.config.integrations.config_entry.delete"
              )}
            </mwc-list-item>
          </ha-button-menu>
        </div>
      </ha-card>
    `;
  }

  private _selectConfigEntry(ev: Event) {
    this.selectedConfigEntryId = (ev.currentTarget as any).entryId;
  }

  private _back() {
    this.selectedConfigEntryId = undefined;
    this.classList.remove("highlight");
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
    return this.deviceRegistryEntries.filter(
      (device) =>
        device.config_entries.includes(configEntry.entry_id) &&
        device.entry_type !== "service"
    );
  }

  private _getServices(configEntry: ConfigEntry): DeviceRegistryEntry[] {
    if (!this.deviceRegistryEntries) {
      return [];
    }
    return this.deviceRegistryEntries.filter(
      (device) =>
        device.config_entries.includes(configEntry.entry_id) &&
        device.entry_type === "service"
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

  private _handleReload(ev: CustomEvent<RequestSelectedDetail>): void {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    this._reloadIntegration(
      ((ev.target as HTMLElement).closest("ha-card") as any).configEntry
    );
  }

  private _handleDelete(ev: CustomEvent<RequestSelectedDetail>): void {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    this._removeIntegration(
      ((ev.target as HTMLElement).closest("ha-card") as any).configEntry
    );
  }

  private _handleSystemOptions(ev: CustomEvent<RequestSelectedDetail>): void {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    this._showSystemOptions(
      ((ev.target as HTMLElement).closest("ha-card") as any).configEntry
    );
  }

  private _showSystemOptions(configEntry: ConfigEntry) {
    showConfigEntrySystemOptionsDialog(this, {
      entry: configEntry,
    });
  }

  private async _removeIntegration(configEntry: ConfigEntry) {
    const entryId = configEntry.entry_id;

    const confirmed = await showConfirmationDialog(this, {
      text: this.hass.localize(
        "ui.panel.config.integrations.config_entry.delete_confirm"
      ),
    });

    if (!confirmed) {
      return;
    }
    deleteConfigEntry(this.hass, entryId).then((result) => {
      fireEvent(this, "entry-removed", { entryId });

      if (result.require_restart) {
        showAlertDialog(this, {
          text: this.hass.localize(
            "ui.panel.config.integrations.config_entry.restart_confirm"
          ),
        });
      }
    });
  }

  private async _reloadIntegration(configEntry: ConfigEntry) {
    const entryId = configEntry.entry_id;

    reloadConfigEntry(this.hass, entryId).then((result) => {
      const locale_key = result.require_restart
        ? "reload_restart_confirm"
        : "reload_confirm";
      showAlertDialog(this, {
        text: this.hass.localize(
          `ui.panel.config.integrations.config_entry.${locale_key}`
        ),
      });
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
    fireEvent(this, "entry-updated", { entry: newEntry });
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
        :host(.highlight) ha-card {
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
          justify-content: center;
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
          min-height: 24px;
        }
        h3 {
          word-wrap: break-word;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        ha-button-menu {
          color: var(--secondary-text-color);
          --mdc-menu-min-width: 200px;
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
        mwc-list-item ha-svg-icon {
          color: var(--secondary-text-color);
        }
        .back-btn {
          position: absolute;
          background: rgba(var(--rgb-card-background-color), 0.6);
          border-radius: 50%;
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
