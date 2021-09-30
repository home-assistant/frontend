import "@material/mwc-button";
import "@material/mwc-list/mwc-list-item";
import type { RequestSelectedDetail } from "@material/mwc-list/mwc-list-item";
import { mdiAlertCircle, mdiDotsVertical, mdiOpenInNew } from "@mdi/js";
import "@polymer/paper-item";
import "@polymer/paper-listbox";
import "@polymer/paper-tooltip/paper-tooltip";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../common/dom/fire_event";
import { shouldHandleRequestSelectedEvent } from "../../../common/mwc/handle-request-selected-event";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import "../../../components/ha-svg-icon";
import {
  ConfigEntry,
  deleteConfigEntry,
  disableConfigEntry,
  DisableConfigEntryResult,
  enableConfigEntry,
  reloadConfigEntry,
  updateConfigEntry,
  ERROR_STATES,
} from "../../../data/config_entries";
import type { DeviceRegistryEntry } from "../../../data/device_registry";
import type { EntityRegistryEntry } from "../../../data/entity_registry";
import type { IntegrationManifest } from "../../../data/integration";
import { showConfigEntrySystemOptionsDialog } from "../../../dialogs/config-entry-system-options/show-dialog-config-entry-system-options";
import { showOptionsFlowDialog } from "../../../dialogs/config-flow/show-dialog-options-flow";
import {
  showAlertDialog,
  showConfirmationDialog,
  showPromptDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { haStyle, haStyleScrollbar } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { ConfigEntryExtended } from "./ha-config-integrations";
import "./ha-integration-header";

const integrationsWithPanel = {
  hassio: "/hassio/dashboard",
  mqtt: "/config/mqtt",
  zha: "/config/zha/dashboard",
  ozw: "/config/ozw/dashboard",
  zwave: "/config/zwave",
  zwave_js: "/config/zwave_js/dashboard",
};

@customElement("ha-integration-card")
export class HaIntegrationCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public domain!: string;

  @property() public items!: ConfigEntryExtended[];

  @property() public manifest?: IntegrationManifest;

  @property() public entityRegistryEntries!: EntityRegistryEntry[];

  @property() public deviceRegistryEntries!: DeviceRegistryEntry[];

  @property() public selectedConfigEntryId?: string;

  @property({ type: Boolean }) public disabled = false;

  protected render(): TemplateResult {
    let item = this._selectededConfigEntry;

    if (this.items.length === 1) {
      item = this.items[0];
    } else if (this.selectedConfigEntryId) {
      item = this.items.find(
        (entry) => entry.entry_id === this.selectedConfigEntryId
      );
    }

    const hasItem = item !== undefined;

    return html`
      <ha-card
        outlined
        class=${classMap({
          single: hasItem,
          group: !hasItem,
          hasMultiple: this.items.length > 1,
          disabled: this.disabled,
          "state-not-loaded": hasItem && item!.state === "not_loaded",
          "state-failed-unload": hasItem && item!.state === "failed_unload",
          "state-error": hasItem && ERROR_STATES.includes(item!.state),
        })}
        .configEntry=${item}
      >
        <ha-integration-header
          .hass=${this.hass}
          .banner=${this.disabled
            ? this.hass.localize(
                "ui.panel.config.integrations.config_entry.disable.disabled"
              )
            : undefined}
          .domain=${this.domain}
          .label=${item
            ? item.title || item.localized_domain_name || this.domain
            : undefined}
          .localizedDomainName=${item ? item.localized_domain_name : undefined}
          .manifest=${this.manifest}
          .configEntry=${item}
        >
          ${this.items.length > 1
            ? html`
                <div class="back-btn" slot="above-header">
                  <ha-icon-button
                    icon="hass:chevron-left"
                    @click=${this._back}
                  ></ha-icon-button>
                </div>
              `
            : ""}
        </ha-integration-header>

        ${item
          ? this._renderSingleEntry(item)
          : this._renderGroupedIntegration()}
      </ha-card>
    `;
  }

  private _renderGroupedIntegration(): TemplateResult {
    return html`
      <paper-listbox class="ha-scrollbar">
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
              >
              ${ERROR_STATES.includes(item.state)
                ? html`<span>
                    <ha-svg-icon
                      class="error"
                      .path=${mdiAlertCircle}
                    ></ha-svg-icon
                    ><paper-tooltip animation-delay="0" position="left">
                      ${this.hass.localize(
                        `ui.panel.config.integrations.config_entry.state.${item.state}`
                      )}
                    </paper-tooltip>
                  </span>`
                : ""}
              <ha-icon-next></ha-icon-next>
            </paper-item>`
        )}
      </paper-listbox>
    `;
  }

  private _renderSingleEntry(item: ConfigEntryExtended): TemplateResult {
    const devices = this._getDevices(item);
    const services = this._getServices(item);
    const entities = this._getEntities(item);

    let stateText: [string, ...unknown[]] | undefined;
    let stateTextExtra: TemplateResult | string | undefined;

    if (item.disabled_by) {
      stateText = [
        "ui.panel.config.integrations.config_entry.disable.disabled_cause",
        "cause",
        this.hass.localize(
          `ui.panel.config.integrations.config_entry.disable.disabled_by.${item.disabled_by}`
        ) || item.disabled_by,
      ];
      if (item.state === "failed_unload") {
        stateTextExtra = html`.
        ${this.hass.localize(
          "ui.panel.config.integrations.config_entry.disable_restart_confirm"
        )}.`;
      }
    } else if (item.state === "not_loaded") {
      stateText = ["ui.panel.config.integrations.config_entry.not_loaded"];
    } else if (ERROR_STATES.includes(item.state)) {
      stateText = [
        `ui.panel.config.integrations.config_entry.state.${item.state}`,
      ];
      if (item.reason) {
        this.hass.loadBackendTranslation("config", item.domain);
        stateTextExtra = html`:
        ${this.hass.localize(
          `component.${item.domain}.config.error.${item.reason}`
        ) || item.reason}`;
      } else {
        stateTextExtra = html`
          <br />
          <a href="/config/logs"
            >${this.hass.localize(
              "ui.panel.config.integrations.config_entry.check_the_logs"
            )}</a
          >
        `;
      }
    }

    return html`
      ${stateText
        ? html`
            <div class="message">
              <ha-svg-icon .path=${mdiAlertCircle}></ha-svg-icon>
              <div>${this.hass.localize(...stateText)}${stateTextExtra}</div>
            </div>
          `
        : ""}
      <div class="content">
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
      <div class="actions">
        <div>
          ${item.disabled_by === "user"
            ? html`<mwc-button unelevated @click=${this._handleEnable}>
                ${this.hass.localize("ui.common.enable")}
              </mwc-button>`
            : item.domain in integrationsWithPanel
            ? html`<a
                href=${`${integrationsWithPanel[item.domain]}?config_entry=${
                  item.entry_id
                }`}
                ><mwc-button>
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.configure"
                  )}
                </mwc-button></a
              >`
            : item.supports_options
            ? html`
                <mwc-button @click=${this._showOptions}>
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.configure"
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
          <mwc-list-item @request-selected=${this._handleRename}>
            ${this.hass.localize(
              "ui.panel.config.integrations.config_entry.rename"
            )}
          </mwc-list-item>
          <mwc-list-item @request-selected=${this._handleSystemOptions}>
            ${this.hass.localize(
              "ui.panel.config.integrations.config_entry.system_options"
            )}
          </mwc-list-item>
          ${this.manifest
            ? html` <a
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
              </a>`
            : ""}
          ${!item.disabled_by &&
          item.state === "loaded" &&
          item.supports_unload &&
          item.source !== "system"
            ? html`<mwc-list-item @request-selected=${this._handleReload}>
                ${this.hass.localize(
                  "ui.panel.config.integrations.config_entry.reload"
                )}
              </mwc-list-item>`
            : ""}
          ${item.disabled_by === "user"
            ? html`<mwc-list-item @request-selected=${this._handleEnable}>
                ${this.hass.localize("ui.common.enable")}
              </mwc-list-item>`
            : item.source !== "system"
            ? html`<mwc-list-item
                class="warning"
                @request-selected=${this._handleDisable}
              >
                ${this.hass.localize("ui.common.disable")}
              </mwc-list-item>`
            : ""}
          ${item.source !== "system"
            ? html`<mwc-list-item
                class="warning"
                @request-selected=${this._handleDelete}
              >
                ${this.hass.localize(
                  "ui.panel.config.integrations.config_entry.delete"
                )}
              </mwc-list-item>`
            : ""}
        </ha-button-menu>
      </div>
    `;
  }

  private get _selectededConfigEntry(): ConfigEntryExtended | undefined {
    return this.items.length === 1
      ? this.items[0]
      : this.selectedConfigEntryId
      ? this.items.find(
          (entry) => entry.entry_id === this.selectedConfigEntryId
        )
      : undefined;
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

  private _showOptions(ev) {
    showOptionsFlowDialog(this, ev.target.closest("ha-card").configEntry);
  }

  private _handleRename(ev: CustomEvent<RequestSelectedDetail>): void {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    this._editEntryName(
      ((ev.target as HTMLElement).closest("ha-card") as any).configEntry
    );
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

  private _handleDisable(ev: CustomEvent<RequestSelectedDetail>): void {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    this._disableIntegration(
      ((ev.target as HTMLElement).closest("ha-card") as any).configEntry
    );
  }

  private _handleEnable(ev: CustomEvent<RequestSelectedDetail>): void {
    if (ev.detail.source && !shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    this._enableIntegration(
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
      manifest: this.manifest,
      entryUpdated: (entry) =>
        fireEvent(this, "entry-updated", {
          entry,
        }),
    });
  }

  private async _disableIntegration(configEntry: ConfigEntry) {
    const entryId = configEntry.entry_id;

    const confirmed = await showConfirmationDialog(this, {
      text: this.hass.localize(
        "ui.panel.config.integrations.config_entry.disable.disable_confirm"
      ),
    });

    if (!confirmed) {
      return;
    }
    let result: DisableConfigEntryResult;
    try {
      result = await disableConfigEntry(this.hass, entryId);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.integrations.config_entry.disable_error"
        ),
        text: err.message,
      });
      return;
    }
    if (result.require_restart) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.integrations.config_entry.disable_restart_confirm"
        ),
      });
    }
    fireEvent(this, "entry-updated", {
      entry: { ...configEntry, disabled_by: "user" },
    });
  }

  private async _enableIntegration(configEntry: ConfigEntry) {
    const entryId = configEntry.entry_id;

    let result: DisableConfigEntryResult;
    try {
      result = await enableConfigEntry(this.hass, entryId);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.integrations.config_entry.disable_error"
        ),
        text: err.message,
      });
      return;
    }

    if (result.require_restart) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.integrations.config_entry.enable_restart_confirm"
        ),
      });
    }
    fireEvent(this, "entry-updated", {
      entry: { ...configEntry, disabled_by: null },
    });
  }

  private async _removeIntegration(configEntry: ConfigEntry) {
    const entryId = configEntry.entry_id;

    const confirmed = await showConfirmationDialog(this, {
      text: this.hass.localize(
        "ui.panel.config.integrations.config_entry.delete_confirm",
        { title: configEntry.title }
      ),
    });

    if (!confirmed) {
      return;
    }
    const result = await deleteConfigEntry(this.hass, entryId);
    fireEvent(this, "entry-removed", { entryId });

    if (result.require_restart) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.integrations.config_entry.restart_confirm"
        ),
      });
    }
  }

  private async _reloadIntegration(configEntry: ConfigEntry) {
    const entryId = configEntry.entry_id;

    const result = await reloadConfigEntry(this.hass, entryId);
    const locale_key = result.require_restart
      ? "reload_restart_confirm"
      : "reload_confirm";
    showAlertDialog(this, {
      text: this.hass.localize(
        `ui.panel.config.integrations.config_entry.${locale_key}`
      ),
    });
  }

  private async _editEntryName(configEntry: ConfigEntry) {
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
    const result = await updateConfigEntry(this.hass, configEntry.entry_id, {
      title: newName,
    });
    fireEvent(this, "entry-updated", { entry: result.config_entry });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleScrollbar,
      css`
        ha-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          --state-color: var(--divider-color, #e0e0e0);
          --ha-card-border-color: var(--state-color);
          --state-message-color: var(--state-color);
        }
        .state-error {
          --state-color: var(--error-color);
          --text-on-state-color: var(--text-primary-color);
        }
        .state-failed-unload {
          --state-color: var(--warning-color);
          --text-on-state-color: var(--primary-text-color);
        }
        .state-not-loaded {
          --state-message-color: var(--primary-text-color);
        }
        :host(.highlight) ha-card {
          --state-color: var(--primary-color);
          --text-on-state-color: var(--text-primary-color);
        }

        .back-btn {
          background-color: var(--state-color);
          color: var(--text-on-state-color);
          --mdc-icon-button-size: 32px;
          transition: height 0.1s;
          overflow: hidden;
        }
        .hasMultiple.single .back-btn {
          height: 24px;
          display: flex;
          align-items: center;
        }
        .hasMultiple.group .back-btn {
          height: 0px;
        }

        .message {
          font-weight: bold;
          padding-bottom: 16px;
          display: flex;
          margin-left: 40px;
        }
        .message ha-svg-icon {
          color: var(--state-message-color);
        }
        .message div {
          flex: 1;
          margin-left: 8px;
          padding-top: 2px;
          padding-right: 2px;
          overflow-wrap: break-word;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 7;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .content {
          flex: 1;
          padding: 0px 16px 0 72px;
        }

        .actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0 0 8px;
          height: 48px;
        }
        .actions a {
          text-decoration: none;
        }
        a {
          color: var(--primary-color);
        }
        ha-button-menu {
          color: var(--secondary-text-color);
          --mdc-menu-min-width: 200px;
        }
        @media (min-width: 563px) {
          ha-card.group {
            position: relative;
            min-height: 164px;
          }
          paper-listbox {
            position: absolute;
            top: 64px;
            left: 0;
            right: 0;
            bottom: 0;
            overflow: auto;
          }
          .disabled paper-listbox {
            top: 88px;
          }
        }
        paper-item {
          cursor: pointer;
          min-height: 35px;
        }
        paper-item-body {
          word-wrap: break-word;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        mwc-list-item ha-svg-icon {
          color: var(--secondary-text-color);
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
