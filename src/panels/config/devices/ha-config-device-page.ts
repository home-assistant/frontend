import {
  property,
  LitElement,
  html,
  customElement,
  css,
  CSSResult,
} from "lit-element";

import memoizeOne from "memoize-one";

import "../../../layouts/hass-subpage";
import "../../../layouts/hass-error-screen";
import "../ha-config-section";

import "./device-detail/ha-device-triggers-card";
import "./device-detail/ha-device-conditions-card";
import "./device-detail/ha-device-actions-card";
import "./device-detail/ha-device-entities-card";
import { HomeAssistant } from "../../../types";
import { ConfigEntry } from "../../../data/config_entries";
import {
  EntityRegistryEntry,
  updateEntityRegistryEntry,
} from "../../../data/entity_registry";
import {
  DeviceRegistryEntry,
  updateDeviceRegistryEntry,
} from "../../../data/device_registry";
import { AreaRegistryEntry } from "../../../data/area_registry";
import {
  loadDeviceRegistryDetailDialog,
  showDeviceRegistryDetailDialog,
} from "../../../dialogs/device-registry-detail/show-dialog-device-registry-detail";

import {
  DeviceTrigger,
  DeviceAction,
  DeviceCondition,
  fetchDeviceTriggers,
  fetchDeviceConditions,
  fetchDeviceActions,
} from "../../../data/device_automation";
import { compare } from "../../../common/string/compare";
import { computeStateName } from "../../../common/entity/compute_state_name";

export interface EntityRegistryStateEntry extends EntityRegistryEntry {
  stateName?: string;
}

@customElement("ha-config-device-page")
export class HaConfigDevicePage extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public devices!: DeviceRegistryEntry[];
  @property() public entries!: ConfigEntry[];
  @property() public entities!: EntityRegistryEntry[];
  @property() public areas!: AreaRegistryEntry[];
  @property() public deviceId!: string;
  @property() public narrow!: boolean;
  @property() private _triggers: DeviceTrigger[] = [];
  @property() private _conditions: DeviceCondition[] = [];
  @property() private _actions: DeviceAction[] = [];

  private _device = memoizeOne(
    (
      deviceId: string,
      devices: DeviceRegistryEntry[]
    ): DeviceRegistryEntry | undefined =>
      devices ? devices.find((device) => device.id === deviceId) : undefined
  );

  private _entities = memoizeOne(
    (
      deviceId: string,
      entities: EntityRegistryEntry[]
    ): EntityRegistryStateEntry[] =>
      entities
        .filter((entity) => entity.device_id === deviceId)
        .map((entity) => {
          return { ...entity, stateName: this._computeEntityName(entity) };
        })
        .sort((ent1, ent2) =>
          compare(
            ent1.stateName || `zzz${ent1.entity_id}`,
            ent2.stateName || `zzz${ent2.entity_id}`
          )
        )
  );

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    loadDeviceRegistryDetailDialog();
  }

  protected async updated(changedProps): Promise<void> {
    super.updated(changedProps);

    if (changedProps.has("deviceId")) {
      this._triggers = this.deviceId
        ? await fetchDeviceTriggers(this.hass, this.deviceId)
        : [];
      this._conditions = this.deviceId
        ? await fetchDeviceConditions(this.hass, this.deviceId)
        : [];
      this._actions = this.deviceId
        ? await fetchDeviceActions(this.hass, this.deviceId)
        : [];
    }
  }

  protected render() {
    const device = this._device(this.deviceId, this.devices);

    if (!device) {
      return html`
        <hass-error-screen error="Device not found."></hass-error-screen>
      `;
    }

    const entities = this._entities(this.deviceId, this.entities);

    return html`
      <hass-subpage .header=${device.name_by_user || device.name}>
        <paper-icon-button
          slot="toolbar-icon"
          icon="hass:settings"
          @click=${this._showSettings}
        ></paper-icon-button>
        <ha-config-section .isWide=${!this.narrow}>
          <span slot="header">Device info</span>
          <span slot="introduction">
            Here are all the details of your device.
          </span>
          <ha-device-card
            .hass=${this.hass}
            .areas=${this.areas}
            .devices=${this.devices}
            .device=${device}
            .entities=${this.entities}
            hide-settings
            hide-entities
          ></ha-device-card>

          ${entities.length
            ? html`
                <div class="header">Entities</div>
                <ha-device-entities-card
                  .hass=${this.hass}
                  .entities=${entities}
                >
                </ha-device-entities-card>
              `
            : html``}
          ${this._triggers.length ||
          this._conditions.length ||
          this._actions.length
            ? html`
                <div class="header">Automations</div>
                <ha-device-triggers-card
                  .hass=${this.hass}
                  .automations=${this._triggers}
                ></ha-device-triggers-card>
                <ha-device-conditions-card
                  .hass=${this.hass}
                  .automations=${this._conditions}
                ></ha-device-conditions-card>
                <ha-device-actions-card
                  .hass=${this.hass}
                  .automations=${this._actions}
                ></ha-device-actions-card>
              `
            : html``}
        </ha-config-section>
      </hass-subpage>
    `;
  }

  private _computeEntityName(entity) {
    if (entity.name) {
      return entity.name;
    }
    const state = this.hass.states[entity.entity_id];
    return state ? computeStateName(state) : null;
  }

  private _showSettings() {
    const device = this._device(this.deviceId, this.devices)!;
    showDeviceRegistryDetailDialog(this, {
      device,
      updateEntry: async (updates) => {
        const deviceName = device.name_by_user || device.name;
        await updateDeviceRegistryEntry(this.hass, this.deviceId, updates);

        if (deviceName && updates.name_by_user) {
          const entities = this._entities(this.deviceId, this.entities);
          entities.forEach(async (entity) => {
            const name = entity.name || entity.stateName!;
            if (name && name.includes(deviceName)) {
              let newEntityId;
              if (
                entity.entity_id.includes(deviceName.toLowerCase()) &&
                confirm(
                  "Do you also want to rename the entity id's of your entities?"
                )
              ) {
                newEntityId = entity.entity_id.replace(
                  deviceName.toLowerCase(),
                  updates.name_by_user!.toLowerCase().replace(" ", "_")
                );
              } else {
                newEntityId = entity.entity_id;
              }
              await updateEntityRegistryEntry(this.hass!, entity.entity_id, {
                name: name.replace(deviceName, updates.name_by_user!),
                disabled_by: entity.disabled_by,
                new_entity_id: newEntityId,
              });
            }
          });
        }
      },
    });
  }

  static get styles(): CSSResult {
    return css`
      .header {
        font-family: var(--paper-font-display1_-_font-family);
        -webkit-font-smoothing: var(
          --paper-font-display1_-_-webkit-font-smoothing
        );
        font-size: var(--paper-font-display1_-_font-size);
        font-weight: var(--paper-font-display1_-_font-weight);
        letter-spacing: var(--paper-font-display1_-_letter-spacing);
        line-height: var(--paper-font-display1_-_line-height);
        opacity: var(--dark-primary-opacity);
      }

      ha-config-section *:last-child {
        padding-bottom: 24px;
      }
    `;
  }
}
