import {
  property,
  LitElement,
  html,
  customElement,
  css,
  CSSResult,
} from "lit-element";

import memoizeOne from "memoize-one";

import "../../../layouts/hass-tabs-subpage";
import "../../../layouts/hass-error-screen";
import "../ha-config-section";

import "./device-detail/ha-device-card";
import "./device-detail/ha-device-triggers-card";
import "./device-detail/ha-device-conditions-card";
import "./device-detail/ha-device-actions-card";
import "./device-detail/ha-device-entities-card";
import { HomeAssistant, Route } from "../../../types";
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
import { createValidEntityId } from "../../../common/entity/valid_entity_id";
import { configSections } from "../ha-panel-config";

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
  @property() public showAdvanced!: boolean;
  @property() public route!: Route;
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

  protected updated(changedProps): void {
    super.updated(changedProps);

    if (changedProps.has("deviceId")) {
      if (this.deviceId) {
        fetchDeviceTriggers(this.hass, this.deviceId).then(
          (triggers) => (this._triggers = triggers)
        );
        fetchDeviceConditions(this.hass, this.deviceId).then(
          (conditions) => (this._conditions = conditions)
        );
        fetchDeviceActions(this.hass, this.deviceId).then(
          (actions) => (this._actions = actions)
        );
      } else {
        this._triggers = [];
        this._conditions = [];
        this._actions = [];
      }
    }
  }

  protected render() {
    const device = this._device(this.deviceId, this.devices);

    if (!device) {
      return html`
        <hass-error-screen
          error="${this.hass.localize(
            "ui.panel.config.devices.device_not_found"
          )}"
        ></hass-error-screen>
      `;
    }

    const entities = this._entities(this.deviceId, this.entities);

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .tabs=${configSections.integrations}
        .route=${this.route}
      >
        <paper-icon-button
          slot="toolbar-icon"
          icon="hass:settings"
          @click=${this._showSettings}
        ></paper-icon-button>
        <ha-config-section .isWide=${!this.narrow}>
          <span slot="header"
            >${this.hass.localize("ui.panel.config.devices.info")}</span
          >
          <span slot="introduction">
            ${this.hass.localize("ui.panel.config.devices.details")}
          </span>
          <ha-device-card
            .hass=${this.hass}
            .areas=${this.areas}
            .devices=${this.devices}
            .device=${device}
          ></ha-device-card>

          ${entities.length
            ? html`
                <div class="header">
                  ${this.hass.localize(
                    "ui.panel.config.devices.entities.entities"
                  )}
                </div>
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
                <div class="header">
                  ${this.hass.localize("ui.panel.config.devices.automations")}
                </div>
                ${this._triggers.length
                  ? html`
                      <ha-device-triggers-card
                        .hass=${this.hass}
                        .automations=${this._triggers}
                      ></ha-device-triggers-card>
                    `
                  : ""}
                ${this._conditions.length
                  ? html`
                      <ha-device-conditions-card
                        .hass=${this.hass}
                        .automations=${this._conditions}
                      ></ha-device-conditions-card>
                    `
                  : ""}
                ${this._actions.length
                  ? html`
                      <ha-device-actions-card
                        .hass=${this.hass}
                        .automations=${this._actions}
                      ></ha-device-actions-card>
                    `
                  : ""}
              `
            : html``}
        </ha-config-section>
      </hass-tabs-subpage>
    `;
  }

  private _computeEntityName(entity) {
    if (entity.name) {
      return entity.name;
    }
    const state = this.hass.states[entity.entity_id];
    return state ? computeStateName(state) : null;
  }

  private async _showSettings() {
    const device = this._device(this.deviceId, this.devices)!;
    showDeviceRegistryDetailDialog(this, {
      device,
      updateEntry: async (updates) => {
        const oldDeviceName = device.name_by_user || device.name;
        const newDeviceName = updates.name_by_user;
        await updateDeviceRegistryEntry(this.hass, this.deviceId, updates);

        if (
          !oldDeviceName ||
          !newDeviceName ||
          oldDeviceName === newDeviceName
        ) {
          return;
        }
        const entities = this._entities(this.deviceId, this.entities);

        const renameEntityid =
          this.showAdvanced &&
          confirm(
            this.hass.localize(
              "ui.panel.config.devices.confirm_rename_entity_ids"
            )
          );

        const updateProms = entities.map((entity) => {
          const name = entity.name || entity.stateName;
          let newEntityId: string | null = null;
          let newName: string | null = null;

          if (name && name.includes(oldDeviceName)) {
            newName = name.replace(oldDeviceName, newDeviceName);
          }

          if (renameEntityid) {
            const oldSearch = createValidEntityId(oldDeviceName);
            if (entity.entity_id.includes(oldSearch)) {
              newEntityId = entity.entity_id.replace(
                oldSearch,
                createValidEntityId(newDeviceName)
              );
            }
          }

          if (!newName && !newEntityId) {
            return new Promise((resolve) => resolve());
          }

          return updateEntityRegistryEntry(this.hass!, entity.entity_id, {
            name: newName || name,
            disabled_by: entity.disabled_by,
            new_entity_id: newEntityId || entity.entity_id,
          });
        });
        await Promise.all(updateProms);
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
