import {
  mdiAlertCircle,
  mdiDelete,
  mdiDragHorizontalVariant,
  mdiPlus,
  mdiWater,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { navigate } from "../../../../common/navigate";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { computeAreaName } from "../../../../common/entity/compute_area_name";
import { getEntityAreaId } from "../../../../common/entity/context/get_entity_context";
import "../../../../components/automation/ha-automation-row";
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
} from "../../../../data/energy";
import {
  computeEnergyLabel,
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
import { showEnergySettingsDialog } from "../dialogs/show-dialogs-energy";
import type { EnergyEditorConfig } from "../editors/energy-editor";
import "../ha-energy-editor-page";
import type { EnergyEditorPageConfig } from "../ha-energy-editor-page";
import "./ha-energy-validation-result";
import { energyCardStyles } from "./styles";

@customElement("ha-energy-device-settings-water")
export class EnergyDeviceSettingsWater extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public preferences!: EnergyPreferences;

  @property({ attribute: false })
  public statsMetadata?: Record<string, StatisticsMetaData>;

  @property({ attribute: false })
  public validationResult?: EnergyPreferencesValidation;

  /** Path of the list page, editors open on pages under it instead of dialogs */
  @property({ attribute: false }) public listPath?: string;

  /** Shows the editor page of the item with this key, or `new` to add one */
  @property({ attribute: false }) public editKey?: string;

  @property({ type: Boolean }) public narrow = false;

  protected render(): TemplateResult {
    if (this.listPath && this.editKey !== undefined) {
      return html`<ha-energy-editor-page
        .hass=${this.hass}
        .narrow=${this.narrow}
        .backPath=${this.listPath}
        .config=${this._editorPage(this.editKey)}
      ></ha-energy-editor-page>`;
    }

    return html`
      <ha-card>
        <h1 class="card-header">
          <ha-svg-icon .path=${mdiWater}></ha-svg-icon>
          ${this.hass.localize(
            "ui.panel.config.energy.device_consumption_water.title"
          )}
        </h1>

        <div class="card-content">
          <p>
            ${this.hass.localize(
              "ui.panel.config.energy.device_consumption_water.sub"
            )}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href=${documentationUrl(
                this.hass,
                "/docs/energy/water/#individual-devices"
              )}
              >${this.hass.localize(
                "ui.panel.config.energy.device_consumption_water.learn_more"
              )}</a
            >
          </p>
          ${this.validationResult?.device_consumption_water.map(
            (result) => html`
              <ha-energy-validation-result
                .hass=${this.hass}
                .issues=${result}
              ></ha-energy-validation-result>
            `
          )}
          ${
            this.preferences.device_consumption_water.length > 0
              ? html`
                  <ha-sortable
                    handle-selector=".handle"
                    @item-moved=${this._itemMoved}
                  >
                    <div class="items">
                      ${repeat(
                        this.preferences.device_consumption_water,
                        (device) => device.stat_consumption,
                        (device, index) => this._renderDevice(device, index)
                      )}
                    </div>
                  </ha-sortable>
                `
              : nothing
          }
          <ha-button @click=${this._addDevice} appearance="filled" size="s">
            <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.energy.device_consumption_water.add_device"
            )}
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  private _renderDevice(
    device: DeviceConsumptionEnergyPreference,
    index: number
  ) {
    const entityState = this.hass.states[device.stat_consumption];
    const areaId = getEntityAreaId(
      device.stat_consumption,
      this.hass.entities,
      this.hass.devices
    );
    const area = areaId ? this.hass.areas[areaId] : undefined;
    const areaName = area ? computeAreaName(area) : undefined;
    return html`
      <ha-card outlined>
        <ha-automation-row .device=${device} @click=${this._editDevice}>
          ${
            entityState?.attributes.icon
              ? html`<ha-icon
                  slot="leading-icon"
                  .icon=${entityState.attributes.icon}
                ></ha-icon>`
              : html`<ha-svg-icon
                  slot="leading-icon"
                  .path=${mdiWater}
                ></ha-svg-icon>`
          }
          <div slot="header" class="row-header">
            <span class="label">${this._deviceName(device)}</span>
            ${
              areaName
                ? html`<span class="label secondary">${areaName}</span>`
                : nothing
            }
          </div>
          ${this._renderIssueIndicator(
            this.validationResult?.device_consumption_water[index],
            index
          )}
          <ha-icon-button
            slot="icons"
            .label=${this.hass.localize("ui.common.delete")}
            .path=${mdiDelete}
            .device=${device}
            @click=${this._deleteDeviceClicked}
            @keydown=${stopPropagation}
          ></ha-icon-button>
          <div class="handle" slot="icons" @click=${stopPropagation}>
            <ha-svg-icon .path=${mdiDragHorizontalVariant}></ha-svg-icon>
          </div>
        </ha-automation-row>
      </ha-card>
    `;
  }

  private _deviceName(device: DeviceConsumptionEnergyPreference) {
    return computeEnergyLabel(
      this.hass.states,
      this.hass.formatEntityName,
      device.stat_consumption,
      this.statsMetadata?.[device.stat_consumption],
      device.name
    );
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
        slot="icons"
        class="issue-icon"
        .path=${mdiAlertCircle}
        aria-label=${label}
      ></ha-svg-icon>
      <ha-tooltip slot="icons" .for=${id} placement="top">${label}</ha-tooltip>
    `;
  }

  private _itemMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const devices = this.preferences.device_consumption_water.concat();
    const device = devices.splice(oldIndex, 1)[0];
    devices.splice(newIndex, 0, device);

    const newPrefs = {
      ...this.preferences,
      device_consumption_water: devices,
    };
    fireEvent(this, "value-changed", { value: newPrefs });
    this._savePreferences(newPrefs);
  }

  private _addDevice() {
    this._openEditor();
  }

  private _editDevice(ev) {
    this._openEditor(ev.currentTarget.device);
  }

  private _openEditor(device?: DeviceConsumptionEnergyPreference) {
    if (this.listPath) {
      navigate(
        `${this.listPath}/device/${device ? encodeURIComponent(device.stat_consumption) : "new"}`
      );
    } else {
      showEnergySettingsDialog(this, {
        editor: this._editorConfig(this.preferences, device),
      });
    }
  }

  private _editorConfig(
    preferences: EnergyPreferences,
    device?: DeviceConsumptionEnergyPreference
  ): EnergyEditorConfig {
    return {
      kind: "water_device",
      params: {
        statsMetadata: this.statsMetadata,
        device: device ? { ...device } : undefined,
        device_consumptions: preferences.device_consumption_water,
        saveCallback: (newDevice) => this._saveDevice(newDevice, device),
      },
    };
  }

  private _deviceIndex(device: DeviceConsumptionEnergyPreference) {
    const devices = this.preferences.device_consumption_water;
    const index = devices.indexOf(device);
    if (index !== -1) {
      return index;
    }
    // Saving replaces the preferences, after which only the statistic matches
    return devices.findIndex(
      (d) => d.stat_consumption === device.stat_consumption
    );
  }

  // Kept per item: a save replaces the preferences right before the page leaves
  private _editorPage = memoizeOne(
    (key: string): EnergyEditorPageConfig | undefined => {
      if (key === "new") {
        return this._pageConfig(this._editorConfig(this.preferences));
      }
      const device = this.preferences.device_consumption_water.find(
        (item) => item.stat_consumption === key
      );
      return (
        device &&
        this._pageConfig(this._editorConfig(this.preferences, device), device)
      );
    }
  );

  private _pageConfig(
    editor: EnergyEditorConfig,
    device?: DeviceConsumptionEnergyPreference
  ): EnergyEditorPageConfig {
    if (!device) {
      return {
        editor,
        title: this.hass.localize(
          "ui.panel.config.energy.device_consumption_water.add_device"
        ),
      };
    }
    return {
      editor,
      title: this._deviceName(device),
      delete: {
        label: this.hass.localize("ui.common.delete"),
        action: () => this._deleteDevice(device),
      },
    };
  }

  private async _saveDevice(
    device: DeviceConsumptionEnergyPreference,
    original?: DeviceConsumptionEnergyPreference
  ) {
    const devices = [...this.preferences.device_consumption_water];
    const index = original ? this._deviceIndex(original) : -1;
    if (index === -1) {
      devices.push(device);
    } else {
      devices[index] = device;
    }
    const newPrefs = { ...this.preferences, device_consumption_water: devices };
    this._sanitizeParents(newPrefs);
    await this._savePreferences(newPrefs);
  }

  private _sanitizeParents(prefs: EnergyPreferences) {
    const statIds = prefs.device_consumption_water.map(
      (d) => d.stat_consumption
    );
    prefs.device_consumption_water.forEach((d) => {
      if (d.included_in_stat && !statIds.includes(d.included_in_stat)) {
        delete d.included_in_stat;
      }
    });
  }

  private _deleteDeviceClicked(ev) {
    ev.stopPropagation();
    this._deleteDevice(ev.currentTarget.device);
  }

  private async _deleteDevice(
    device: DeviceConsumptionEnergyPreference
  ): Promise<boolean> {
    if (
      !(await showConfirmationDialog(this, {
        title: this.hass.localize("ui.panel.config.energy.delete_source"),
      }))
    ) {
      return false;
    }

    const index = this._deviceIndex(device);
    if (index === -1) {
      return false;
    }
    try {
      const newPrefs = {
        ...this.preferences,
        device_consumption_water:
          this.preferences.device_consumption_water.filter(
            (_device, idx) => idx !== index
          ),
      };
      this._sanitizeParents(newPrefs);
      await this._savePreferences(newPrefs);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.config.energy.save_config_failed", {
          error: err.message,
        }),
      });
      return false;
    }
    return true;
  }

  private async _savePreferences(preferences: EnergyPreferences) {
    const result = await saveEnergyPreferences(this.hass, preferences);
    fireEvent(this, "value-changed", { value: result });
    return result;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      energyCardStyles,
      css`
        .issue-icon {
          color: var(--warning-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-device-settings-water": EnergyDeviceSettingsWater;
  }
}
