import {
  mdiChevronDown,
  mdiCogOutline,
  mdiDelete,
  mdiDevices,
  mdiDotsVertical,
  mdiHandExtendedOutline,
  mdiRenameBox,
  mdiShapeOutline,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import type { ConfigEntry, SubEntry } from "../../../data/config_entries";
import { deleteSubEntry, updateSubEntry } from "../../../data/config_entries";
import type { DeviceRegistryEntry } from "../../../data/device_registry";
import type { DiagnosticInfo } from "../../../data/diagnostics";
import type { EntityRegistryEntry } from "../../../data/entity_registry";
import type { IntegrationManifest } from "../../../data/integration";
import { showSubConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-sub-config-flow";
import type { HomeAssistant } from "../../../types";
import {
  showConfirmationDialog,
  showPromptDialog,
} from "../../lovelace/custom-card-helpers";
import "./ha-config-entry-device-row";

@customElement("ha-config-sub-entry-row")
class HaConfigSubEntryRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public manifest?: IntegrationManifest;

  @property({ attribute: false }) public diagnosticHandler?: DiagnosticInfo;

  @property({ attribute: false }) public entities!: EntityRegistryEntry[];

  @property({ attribute: false }) public entry!: ConfigEntry;

  @property({ attribute: false }) public subEntry!: SubEntry;

  @state() private _expanded = true;

  protected render() {
    const subEntry = this.subEntry;
    const configEntry = this.entry;

    const devices = this._getDevices();
    const services = this._getServices();
    const entities = this._getEntities();

    return html`<ha-md-list>
      <ha-md-list-item
        class="sub-entry"
        data-entry-id=${configEntry.entry_id}
        .configEntry=${configEntry}
        .subEntry=${subEntry}
      >
        ${devices.length || services.length
          ? html`<ha-icon-button
              class="expand-button ${classMap({ expanded: this._expanded })}"
              .path=${mdiChevronDown}
              slot="start"
              @click=${this._toggleExpand}
            ></ha-icon-button>`
          : nothing}
        <span slot="headline">${subEntry.title}</span>
        <span slot="supporting-text"
          >${this.hass.localize(
            `component.${configEntry.domain}.config_subentries.${subEntry.subentry_type}.entry_type`
          )}</span
        >
        ${configEntry.supported_subentry_types[subEntry.subentry_type]
          ?.supports_reconfigure
          ? html`
              <ha-icon-button
                slot="end"
                @click=${this._handleReconfigureSub}
                .path=${mdiCogOutline}
                .label=${this.hass.localize(
                  `component.${configEntry.domain}.config_subentries.${subEntry.subentry_type}.initiate_flow.reconfigure`
                ) ||
                this.hass.localize(
                  "ui.panel.config.integrations.config_entry.configure"
                )}
              >
              </ha-icon-button>
            `
          : nothing}
        <ha-md-button-menu positioning="popover" slot="end">
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          ${devices.length || services.length
            ? html`
                <ha-md-menu-item
                  href=${devices.length === 1
                    ? `/config/devices/device/${devices[0].id}`
                    : `/config/devices/dashboard?historyBack=1&config_entry=${configEntry.entry_id}&sub_entry=${subEntry.subentry_id}`}
                >
                  <ha-svg-icon .path=${mdiDevices} slot="start"></ha-svg-icon>
                  ${this.hass.localize(
                    `ui.panel.config.integrations.config_entry.devices`,
                    { count: devices.length }
                  )}
                  <ha-icon-next slot="end"></ha-icon-next>
                </ha-md-menu-item>
              `
            : nothing}
          ${services.length
            ? html`<ha-md-menu-item
                href=${services.length === 1
                  ? `/config/devices/device/${services[0].id}`
                  : `/config/devices/dashboard?historyBack=1&config_entry=${configEntry.entry_id}&sub_entry=${subEntry.subentry_id}`}
              >
                <ha-svg-icon
                  .path=${mdiHandExtendedOutline}
                  slot="start"
                ></ha-svg-icon>
                ${this.hass.localize(
                  `ui.panel.config.integrations.config_entry.services`,
                  { count: services.length }
                )}
                <ha-icon-next slot="end"></ha-icon-next>
              </ha-md-menu-item> `
            : nothing}
          ${entities.length
            ? html`
                <ha-md-menu-item
                  href=${`/config/entities?historyBack=1&config_entry=${configEntry.entry_id}&sub_entry=${subEntry.subentry_id}`}
                >
                  <ha-svg-icon
                    .path=${mdiShapeOutline}
                    slot="start"
                  ></ha-svg-icon>
                  ${this.hass.localize(
                    `ui.panel.config.integrations.config_entry.entities`,
                    { count: entities.length }
                  )}
                  <ha-icon-next slot="end"></ha-icon-next>
                </ha-md-menu-item>
              `
            : nothing}
          <ha-md-menu-item @click=${this._handleRenameSub}>
            <ha-svg-icon slot="start" .path=${mdiRenameBox}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.integrations.config_entry.rename"
            )}
          </ha-md-menu-item>
          <ha-md-menu-item class="warning" @click=${this._handleDeleteSub}>
            <ha-svg-icon
              slot="start"
              class="warning"
              .path=${mdiDelete}
            ></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.integrations.config_entry.delete"
            )}
          </ha-md-menu-item>
        </ha-md-button-menu>
      </ha-md-list-item>
      ${this._expanded
        ? html`
            ${devices.map(
              (device) =>
                html`<ha-config-entry-device-row
                  .hass=${this.hass}
                  .narrow=${this.narrow}
                  .entry=${this.entry}
                  .device=${device}
                  .entities=${this.entities}
                ></ha-config-entry-device-row>`
            )}
            ${services.map(
              (service) =>
                html`<ha-config-entry-device-row
                  .hass=${this.hass}
                  .narrow=${this.narrow}
                  .entry=${this.entry}
                  .device=${service}
                  .entities=${this.entities}
                ></ha-config-entry-device-row>`
            )}
          `
        : nothing}
    </ha-md-list>`;
  }

  private _toggleExpand() {
    this._expanded = !this._expanded;
  }

  private _getEntities = (): EntityRegistryEntry[] =>
    this.entities.filter(
      (entity) => entity.config_subentry_id === this.subEntry.subentry_id
    );

  private _getDevices = (): DeviceRegistryEntry[] =>
    Object.values(this.hass.devices).filter(
      (device) =>
        device.config_entries_subentries[this.entry.entry_id]?.includes(
          this.subEntry.subentry_id
        ) && device.entry_type !== "service"
    );

  private _getServices = (): DeviceRegistryEntry[] =>
    Object.values(this.hass.devices).filter(
      (device) =>
        device.config_entries_subentries[this.entry.entry_id]?.includes(
          this.subEntry.subentry_id
        ) && device.entry_type === "service"
    );

  private async _handleReconfigureSub(): Promise<void> {
    showSubConfigFlowDialog(this, this.entry, this.subEntry.subentry_type, {
      startFlowHandler: this.entry.entry_id,
      subEntryId: this.subEntry.subentry_id,
    });
  }

  private async _handleRenameSub(): Promise<void> {
    const newName = await showPromptDialog(this, {
      title: this.hass.localize(
        "ui.common.rename"
      ),
      defaultValue: this.subEntry.title,
      inputLabel: this.hass.localize(
        "ui.panel.config.integrations.rename_input_label"
      ),
    });
    if (newName === null) {
      return;
    }
    await updateSubEntry(
      this.hass,
      this.entry.entry_id,
      this.subEntry.subentry_id,
      { title: newName }
    );
  }

  private async _handleDeleteSub(): Promise<void> {
    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.integrations.config_entry.delete_confirm_title",
        { title: this.subEntry.title }
      ),
      text: this.hass.localize(
        "ui.panel.config.integrations.config_entry.delete_confirm_text"
      ),
      confirmText: this.hass!.localize("ui.common.delete"),
      dismissText: this.hass!.localize("ui.common.cancel"),
      destructive: true,
    });

    if (!confirmed) {
      return;
    }
    await deleteSubEntry(
      this.hass,
      this.entry.entry_id,
      this.subEntry.subentry_id
    );
  }

  static styles = css`
    .expand-button {
      margin: 0 -12px;
      transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .expand-button.expanded {
      transform: rotate(180deg);
    }
    ha-md-list {
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      padding: 0;
      margin: 16px;
      margin-top: 0;
    }
    ha-md-list-item.has-subentries {
      border-bottom: 1px solid var(--divider-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-sub-entry-row": HaConfigSubEntryRow;
  }
}
