import {
  mdiCogOutline,
  mdiDelete,
  mdiDevices,
  mdiDotsVertical,
  mdiPencil,
  mdiStopCircleOutline,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { computeDeviceNameDisplay } from "../../../common/entity/compute_device_name";
import { getDeviceContext } from "../../../common/entity/context/get_device_context";
import { navigate } from "../../../common/navigate";
import type { ConfigEntry } from "../../../data/config_entries";
import {
  removeConfigEntryFromDevice,
  updateDeviceRegistryEntry,
  type DeviceRegistryEntry,
} from "../../../data/device_registry";
import type { EntityRegistryEntry } from "../../../data/entity_registry";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../lovelace/custom-card-helpers";
import { showDeviceRegistryDetailDialog } from "../devices/device-registry-detail/show-dialog-device-registry-detail";
import "./ha-config-sub-entry-row";
import { stopPropagation } from "../../../common/dom/stop_propagation";

@customElement("ha-config-entry-device-row")
class HaConfigEntryDeviceRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public entry!: ConfigEntry;

  @property({ attribute: false }) public device!: DeviceRegistryEntry;

  @property({ attribute: false }) public entities!: EntityRegistryEntry[];

  protected render() {
    const device = this.device;

    const entities = this._getEntities();

    const { area } = getDeviceContext(device, this.hass);

    const supportingText = [
      device.model || device.sw_version || device.manufacturer,
      area ? area.name : undefined,
    ].filter(Boolean);

    return html`<ha-md-list-item @click=${this.narrow ? this._handleNavigateToDevice : undefined}>
      <ha-svg-icon .path=${mdiDevices} slot="start"></ha-svg-icon>
      <div slot="headline"></div>${computeDeviceNameDisplay(device, this.hass)}</div>
      <span slot="supporting-text"
        >${supportingText.join(" • ")}
        ${supportingText.length && entities.length ? " • " : nothing}
        ${
          entities.length
            ? this.narrow
              ? this.hass.localize(
                  "ui.panel.config.integrations.config_entry.entities",
                  { count: entities.length }
                )
              : html`<a
                  href=${`/config/entities/?historyBack=1&device=${device.id}`}
                  >${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.entities",
                    { count: entities.length }
                  )}</a
                >`
            : nothing
        }</span
      >
      ${
        !this.narrow
          ? html`<ha-icon-button-next
              slot="end"
              @click=${this._handleNavigateToDevice}
            >
            </ha-icon-button-next>`
          : nothing
      }
      </ha-icon-button>
      <div class="vertical-divider" slot="end" @click=${stopPropagation}></div>
      ${
        !this.narrow
          ? html`<ha-icon-button
              slot="end"
              @click=${this._handleConfigureDevice}
              .path=${mdiPencil}
              .label=${this.hass.localize(
                "ui.panel.config.integrations.config_entry.device.configure"
              )}
            ></ha-icon-button>`
          : nothing
      }
      </ha-icon-button>
      <ha-md-button-menu positioning="popover" slot="end" @click=${stopPropagation}>
        <ha-icon-button
          slot="trigger"
          .label=${this.hass.localize("ui.common.menu")}
          .path=${mdiDotsVertical}
        ></ha-icon-button>
        ${
          this.narrow
            ? html`<ha-md-menu-item @click=${this._handleConfigureDevice}>
                <ha-svg-icon .path=${mdiCogOutline} slot="start"></ha-svg-icon>
                ${this.hass.localize(
                  "ui.panel.config.integrations.config_entry.device.configure"
                )}
              </ha-md-menu-item>`
            : nothing
        }
        <ha-md-menu-item class=${device.disabled_by !== "user" ? "warning" : ""} @click=${this._handleDisableDevice} .disabled=${device.disabled_by !== "user" && device.disabled_by}>
          <ha-svg-icon .path=${mdiStopCircleOutline} slot="start"></ha-svg-icon>
          
          ${
            device.disabled_by && device.disabled_by !== "user"
              ? this.hass.localize(
                  "ui.dialogs.device-registry-detail.enabled_cause",
                  {
                    type: this.hass.localize(
                      `ui.dialogs.device-registry-detail.type.${
                        device.entry_type || "device"
                      }`
                    ),
                    cause: this.hass.localize(
                      `config_entry.disabled_by.${device.disabled_by}`
                    ),
                  }
                )
              : device.disabled_by
                ? this.hass.localize(
                    "ui.panel.config.integrations.config_entry.device.enable"
                  )
                : this.hass.localize(
                    "ui.panel.config.integrations.config_entry.device.disable"
                  )
          }


        </ha-md-menu-item>
        ${
          this.entry.supports_remove_device
            ? html` <ha-md-menu-item
                class="warning"
                @click=${this._handleDeleteDevice}
              >
                <ha-svg-icon .path=${mdiDelete} slot="start"></ha-svg-icon>
                ${this.hass.localize(
                  "ui.panel.config.integrations.config_entry.device.delete"
                )}
              </ha-md-menu-item>`
            : nothing
        }
      </ha-md-button-menu>
    </ha-md-list-item> `;
  }

  private _getEntities = (): EntityRegistryEntry[] =>
    this.entities?.filter((entity) => entity.device_id === this.device.id);

  private _handleConfigureDevice(ev: MouseEvent) {
    ev.stopPropagation(); // Prevent triggering the click handler on the list item
    showDeviceRegistryDetailDialog(this, {
      device: this.device,
      updateEntry: async (updates) => {
        await updateDeviceRegistryEntry(this.hass, this.device.id, updates);
      },
    });
  }

  private async _handleDisableDevice() {
    await updateDeviceRegistryEntry(this.hass, this.device.id, {
      disabled_by: this.device.disabled_by === "user" ? null : "user",
    });
  }

  private async _handleDeleteDevice() {
    const entry = this.entry;
    const confirmed = await showConfirmationDialog(this, {
      text: this.hass.localize("ui.panel.config.devices.confirm_delete"),
      confirmText: this.hass.localize("ui.common.delete"),
      dismissText: this.hass.localize("ui.common.cancel"),
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      await removeConfigEntryFromDevice(
        this.hass!,
        this.device.id,
        entry.entry_id
      );
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.config.devices.error_delete"),
        text: err.message,
      });
    }
  }

  private _handleNavigateToDevice() {
    navigate(`/config/devices/device/${this.device.id}`);
  }

  static styles = [
    haStyle,
    css`
      :host {
        border-top: 1px solid var(--divider-color);
      }
      ha-md-list-item {
        --md-list-item-leading-space: 56px;
      }
      :host([narrow]) ha-md-list-item {
        --md-list-item-leading-space: 16px;
      }
      .vertical-divider {
        height: 100%;
        width: 1px;
        background: var(--divider-color);
      }
      a {
        text-decoration: none;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-entry-device-row": HaConfigEntryDeviceRow;
  }
}
