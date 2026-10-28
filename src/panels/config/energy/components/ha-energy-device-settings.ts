import {
  mdiAlertCircle,
  mdiDelete,
  mdiDevices,
  mdiDragHorizontalVariant,
  mdiPlus,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { repeat } from "lit/directives/repeat";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
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
import type { EnergySidebarConfig } from "../ha-energy-sidebar";
import "./ha-energy-validation-result";
import { scrollSelectedRowIntoView } from "./scroll-selected-row";
import { energyCardStyles } from "./styles";

@customElement("ha-energy-device-settings")
export class EnergyDeviceSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public preferences!: EnergyPreferences;

  @property({ attribute: false })
  public statsMetadata?: Record<string, StatisticsMetaData>;

  @property({ attribute: false })
  public validationResult?: EnergyPreferencesValidation;

  /** Edit in the sidebar of the page instead of a dialog */
  @property({ type: Boolean }) public sidebar = false;

  @property({ attribute: false }) public selectedKey?: string;

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);
    if (changedProps.has("selectedKey") && this.selectedKey) {
      scrollSelectedRowIntoView(this.renderRoot);
    }
  }

  protected render(): TemplateResult {
    return html`
      <ha-card>
        <h1 class="card-header">
          <ha-svg-icon .path=${mdiDevices}></ha-svg-icon>
          ${this.hass.localize(
            "ui.panel.config.energy.device_consumption.title"
          )}
        </h1>

        <div class="card-content">
          <p>
            ${this.hass.localize(
              "ui.panel.config.energy.device_consumption.sub"
            )}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href=${documentationUrl(
                this.hass,
                "/docs/energy/individual-devices/"
              )}
              >${this.hass.localize(
                "ui.panel.config.energy.device_consumption.learn_more"
              )}</a
            >
          </p>
          ${this.validationResult?.device_consumption.map(
            (result) => html`
              <ha-energy-validation-result
                .hass=${this.hass}
                .issues=${result}
              ></ha-energy-validation-result>
            `
          )}
          ${
            this.preferences.device_consumption.length > 0
              ? html`
                  <ha-sortable
                    handle-selector=".handle"
                    @item-moved=${this._itemMoved}
                  >
                    <div class="items">
                      ${repeat(
                        this.preferences.device_consumption,
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
              "ui.panel.config.energy.device_consumption.add_device"
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
        <ha-automation-row
          .selected=${this.selectedKey === `device:${device.stat_consumption}`}
          .device=${device}
          @click=${this._editDevice}
        >
          ${
            entityState?.attributes.icon
              ? html`<ha-icon
                  slot="leading-icon"
                  .icon=${entityState.attributes.icon}
                ></ha-icon>`
              : html`<ha-svg-icon
                  slot="leading-icon"
                  .path=${mdiDevices}
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
            this.validationResult?.device_consumption[index],
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
    const devices = this.preferences.device_consumption.concat();
    const device = devices.splice(oldIndex, 1)[0];
    devices.splice(newIndex, 0, device);

    const newPrefs = {
      ...this.preferences,
      device_consumption: devices,
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
    const editor = this._editorConfig(this.preferences, device);
    if (this.sidebar) {
      fireEvent(
        this,
        "energy-open-sidebar",
        this._sidebarConfig(editor, device)
      );
    } else {
      showEnergySettingsDialog(this, { editor });
    }
  }

  private _editorConfig(
    preferences: EnergyPreferences,
    device?: DeviceConsumptionEnergyPreference
  ): EnergyEditorConfig {
    return {
      kind: "device",
      params: {
        statsMetadata: this.statsMetadata,
        device: device ? { ...device } : undefined,
        device_consumptions: preferences.device_consumption,
        saveCallback: (newDevice) => this._saveDevice(newDevice, device),
      },
    };
  }

  private _deviceIndex(device: DeviceConsumptionEnergyPreference) {
    const devices = this.preferences.device_consumption;
    const index = devices.indexOf(device);
    if (index !== -1) {
      return index;
    }
    // Saving anything replaces the preferences while the sidebar stays open
    return devices.findIndex(
      (d) => d.stat_consumption === device.stat_consumption
    );
  }

  private _sidebarConfig(
    editor: EnergyEditorConfig,
    device?: DeviceConsumptionEnergyPreference
  ): EnergySidebarConfig {
    const subtitle = this.hass.localize(
      "ui.panel.config.energy.device_consumption.title"
    );
    if (!device) {
      return {
        editor,
        title: this.hass.localize(
          "ui.panel.config.energy.device_consumption.add_device"
        ),
        subtitle,
      };
    }
    return {
      key: `device:${device.stat_consumption}`,
      editor,
      title: this._deviceName(device),
      subtitle,
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
    const devices = [...this.preferences.device_consumption];
    const index = original ? this._deviceIndex(original) : -1;
    if (index === -1) {
      devices.push(device);
    } else {
      devices[index] = device;
    }
    const newPrefs = { ...this.preferences, device_consumption: devices };
    this._sanitizeParents(newPrefs);
    const result = await this._savePreferences(newPrefs);
    if (this.sidebar) {
      const saved =
        result.device_consumption[index === -1 ? devices.length - 1 : index];
      fireEvent(
        this,
        "energy-sidebar-saved",
        this._sidebarConfig(this._editorConfig(result, saved), saved)
      );
    }
  }

  private _sanitizeParents(prefs: EnergyPreferences) {
    const statIds = prefs.device_consumption.map((d) => d.stat_consumption);
    prefs.device_consumption.forEach((d) => {
      if (d.included_in_stat && !statIds.includes(d.included_in_stat)) {
        delete d.included_in_stat;
      }
    });
  }

  private _deleteDeviceClicked(ev) {
    ev.stopPropagation();
    this._deleteDevice(ev.currentTarget.device);
  }

  private async _deleteDevice(device: DeviceConsumptionEnergyPreference) {
    if (
      !(await showConfirmationDialog(this, {
        title: this.hass.localize("ui.panel.config.energy.delete_source"),
      }))
    ) {
      return;
    }

    const index = this._deviceIndex(device);
    if (index === -1) {
      return;
    }
    try {
      const newPrefs = {
        ...this.preferences,
        device_consumption: this.preferences.device_consumption.filter(
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
      return;
    }
    if (this.selectedKey === `device:${device.stat_consumption}`) {
      fireEvent(this, "energy-close-sidebar");
    }
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
    "ha-energy-device-settings": EnergyDeviceSettings;
  }
}
