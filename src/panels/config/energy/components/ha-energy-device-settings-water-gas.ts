import {
  mdiAlertCircle,
  mdiDelete,
  mdiDragHorizontalVariant,
  mdiFire,
  mdiPencil,
  mdiPlus,
  mdiWater,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { repeat } from "lit/directives/repeat";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeAreaName } from "../../../../common/entity/compute_area_name";
import { getEntityAreaId } from "../../../../common/entity/context/get_entity_context";
import "../../../../components/ha-card";
import "../../../../components/ha-button";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-sortable";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-tooltip";
import type {
  DeviceConsumptionEnergyPreference,
  EnergyPreferences,
  EnergyPreferencesValidation,
  EnergyValidationIssue,
  WaterGasResource,
} from "../../../../data/energy";
import {
  computeEnergyDeviceLabels,
  getEnergyGasUnitClass,
  getWaterGasDevices,
  getWaterGasDevicesKey,
  saveEnergyPreferences,
} from "../../../../data/energy";
import type { StatisticsMetaData } from "../../../../data/recorder";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { documentationUrl } from "../../../../util/documentation-url";
import { showEnergySettingsDeviceWaterGasDialog } from "../dialogs/show-dialogs-energy";
import "./ha-energy-validation-result";
import { energyCardStyles } from "./styles";
import type { LocalizeKeys } from "../../../../common/translations/localize";

const ICONS: Record<WaterGasResource, string> = {
  water: mdiWater,
  gas: mdiFire,
};

@customElement("ha-energy-device-settings-water-gas")
export class EnergyDeviceSettingsWaterGas extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public resource!: WaterGasResource;

  @property({ attribute: false })
  public preferences!: EnergyPreferences;

  @property({ attribute: false })
  public statsMetadata?: Record<string, StatisticsMetaData>;

  @property({ attribute: false })
  public validationResult?: EnergyPreferencesValidation;

  private get _devices(): DeviceConsumptionEnergyPreference[] {
    return getWaterGasDevices(this.preferences, this.resource);
  }

  private _withDevices(
    devices: DeviceConsumptionEnergyPreference[]
  ): EnergyPreferences {
    return {
      ...this.preferences,
      [getWaterGasDevicesKey(this.resource)]: devices,
    } as EnergyPreferences;
  }

  private _t(key: string): string {
    return this.hass.localize(
      `ui.panel.config.energy.device_consumption_${this.resource}.${key}` as LocalizeKeys
    );
  }

  protected render(): TemplateResult {
    const devices = this._devices;
    const validation =
      this.validationResult?.[getWaterGasDevicesKey(this.resource)];
    const labels = computeEnergyDeviceLabels(
      this.hass.states,
      this.hass.formatEntityName,
      devices,
      this.statsMetadata
    );

    return html`
      <ha-card>
        <h1 class="card-header">
          <ha-svg-icon .path=${ICONS[this.resource]}></ha-svg-icon>
          ${this._t("title")}
        </h1>

        <div class="card-content">
          <p>
            ${this._t("sub")}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href=${documentationUrl(
                this.hass,
                `/docs/energy/${this.resource}/#individual-${this.resource}-devices`
              )}
              >${this._t("learn_more")}</a
            >
          </p>
          ${validation?.map(
            (result) => html`
              <ha-energy-validation-result
                .hass=${this.hass}
                .issues=${result}
              ></ha-energy-validation-result>
            `
          )}
          ${
            devices.length > 0
              ? html`
                  <div class="items-container">
                    <ha-sortable
                      handle-selector=".handle"
                      @item-moved=${this._itemMoved}
                    >
                      <div class="devices">
                        ${repeat(
                          devices,
                          (device) => device.stat_consumption,
                          (device, index) => html`
                            <div class="row" .device=${device}>
                              <div class="handle">
                                <ha-svg-icon
                                  .path=${mdiDragHorizontalVariant}
                                ></ha-svg-icon>
                              </div>
                              ${this._renderName(device, labels)}
                              ${this._renderIssueIndicator(
                                validation?.[index],
                                index
                              )}
                              <ha-icon-button
                                .label=${this.hass.localize("ui.common.edit")}
                                @click=${this._editDevice}
                                .path=${mdiPencil}
                              ></ha-icon-button>
                              <ha-icon-button
                                .label=${this.hass.localize("ui.common.delete")}
                                @click=${this._deleteDevice}
                                .device=${device}
                                .path=${mdiDelete}
                              ></ha-icon-button>
                            </div>
                          `
                        )}
                      </div>
                    </ha-sortable>
                  </div>
                `
              : ""
          }
          <div class="row">
            <ha-button @click=${this._addDevice} appearance="filled" size="s">
              <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon
              >${this._t("add_device")}</ha-button
            >
          </div>
        </div>
      </ha-card>
    `;
  }

  private _renderName(
    device: DeviceConsumptionEnergyPreference,
    labels: Record<string, string>
  ) {
    const name = labels[device.stat_consumption];
    const areaId = getEntityAreaId(
      device.stat_consumption,
      this.hass.entities,
      this.hass.devices
    );
    const area = areaId ? this.hass.areas[areaId] : undefined;
    const areaName = area ? computeAreaName(area) : undefined;
    return html`
      <div class="content">
        <span class="label">${name}</span>
        ${
          areaName
            ? html`<span class="label secondary">${areaName}</span>`
            : nothing
        }
      </div>
    `;
  }

  private _renderIssueIndicator(
    issues: EnergyValidationIssue[] | undefined,
    index: number
  ) {
    if (!issues?.length) {
      return nothing;
    }
    const titles = issues.map(
      (issue) =>
        this.hass.localize(`component.energy.issues.${issue.type}.title`) ||
        issue.type
    );
    const label = titles.join("\n");
    const id = `issue-icon-${index}`;
    return html`
      <ha-svg-icon
        id=${id}
        class="issue-icon"
        .path=${mdiAlertCircle}
        aria-label=${label}
      ></ha-svg-icon>
      <ha-tooltip .for=${id} placement="top">${label}</ha-tooltip>
    `;
  }

  private _itemMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const devices = this._devices.concat();
    const device = devices.splice(oldIndex, 1)[0];
    devices.splice(newIndex, 0, device);

    const newPrefs = this._withDevices(devices);
    fireEvent(this, "value-changed", { value: newPrefs });
    this._savePreferences(newPrefs);
  }

  private _allowedUnitClass(excludeSource?: string) {
    return this.resource === "gas"
      ? getEnergyGasUnitClass(
          this.preferences,
          excludeSource,
          this.statsMetadata,
          "device"
        )
      : undefined;
  }

  private _editDevice(ev) {
    const origDevice: DeviceConsumptionEnergyPreference =
      ev.currentTarget.closest(".row").device;
    showEnergySettingsDeviceWaterGasDialog(this, {
      resource: this.resource,
      statsMetadata: this.statsMetadata,
      device: { ...origDevice },
      allowedUnitClass: this._allowedUnitClass(origDevice.stat_consumption),
      device_consumptions: this._devices,
      saveCallback: async (newDevice) => {
        const newPrefs = this._withDevices(
          this._devices.map((d) => (d === origDevice ? newDevice : d))
        );
        await this._savePreferences(this._sanitizeParents(newPrefs));
      },
    });
  }

  private _addDevice() {
    showEnergySettingsDeviceWaterGasDialog(this, {
      resource: this.resource,
      statsMetadata: this.statsMetadata,
      allowedUnitClass: this._allowedUnitClass(),
      device_consumptions: this._devices,
      saveCallback: async (device) => {
        await this._savePreferences(
          this._withDevices(this._devices.concat(device))
        );
      },
    });
  }

  private _sanitizeParents(prefs: EnergyPreferences): EnergyPreferences {
    const devices = getWaterGasDevices(prefs, this.resource);
    const statIds = devices.map((d) => d.stat_consumption);
    return {
      ...prefs,
      [getWaterGasDevicesKey(this.resource)]: devices.map((d) =>
        d.included_in_stat && !statIds.includes(d.included_in_stat)
          ? { ...d, included_in_stat: undefined }
          : d
      ),
    } as EnergyPreferences;
  }

  private async _deleteDevice(ev) {
    const deviceToDelete: DeviceConsumptionEnergyPreference =
      ev.currentTarget.device;

    if (
      !(await showConfirmationDialog(this, {
        title: this.hass.localize("ui.panel.config.energy.delete_source"),
      }))
    ) {
      return;
    }

    try {
      const newPrefs = this._sanitizeParents(
        this._withDevices(
          this._devices.filter((device) => device !== deviceToDelete)
        )
      );
      await this._savePreferences(newPrefs);
    } catch (err: any) {
      showAlertDialog(this, { title: `Failed to save config: ${err.message}` });
    }
  }

  private async _savePreferences(preferences: EnergyPreferences) {
    const result = await saveEnergyPreferences(this.hass, preferences);
    fireEvent(this, "value-changed", { value: result });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      energyCardStyles,
      css`
        .row {
          height: 58px;
        }
        .content {
          display: flex;
          flex-direction: column;
        }
        .label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .label.secondary {
          color: var(--secondary-text-color);
          font-size: 0.9em;
        }
        .handle {
          cursor: move; /* fallback if grab cursor is unsupported */
          cursor: grab;
        }
        .issue-icon {
          color: var(--warning-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-device-settings-water-gas": EnergyDeviceSettingsWaterGas;
  }
}
