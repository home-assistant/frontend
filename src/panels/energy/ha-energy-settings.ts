import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  mdiSolarPower,
  mdiTransmissionTower,
  mdiWashingMachine,
} from "@mdi/js";
import { fireEvent } from "../../common/dom/fire_event";
import {
  emptyFlowFromGridSourceEnergyPreference,
  emptyFlowToGridSourceEnergyPreference,
  emptyGridSourceEnergyPreference,
  emptySolarEnergyPreference,
  EnergyPreferences,
  energySourcesByType,
  GridSourceTypeEnergyPreference,
  saveEnergyPreferences,
} from "../../data/energy";
import { HomeAssistant } from "../../types";
import "../../components/entity/ha-statistics-picker";
import "../../components/ha-svg-icon";
import "../../components/ha-icon-next";
import { getStatisticIds, StatisticsMetaData } from "../../data/history";

const energyUnits = ["kWh"];

@customElement("ha-energy-settings")
export class EnergySettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public preferences!: EnergyPreferences;

  @state() private _error?: string;

  @state() private _statisticIds?: StatisticsMetaData[];

  @state() private _state:
    | "overview"
    | "manage_grid"
    | "manage_solar"
    | "manage_devices" = "overview";

  public willUpdate() {
    if (!this.hasUpdated) {
      this._getStatisticIds();
    }
  }

  protected render(): TemplateResult {
    if (this._state === "manage_grid") {
      return this._renderManageGrid();
    }
    if (this._state === "manage_solar") {
      return this._renderManageSolar();
    }
    if (this._state === "manage_devices") {
      return this._renderManageDevices();
    }
    return this._renderOverview();
  }

  private _renderOverview() {
    const types = energySourcesByType(this.preferences);

    const gridSource = types.grid ? types.grid[0] : undefined;
    const solarSource = types.solar ? types.solar[0] : undefined;

    return html`
      ${this._error ? html`<div class="error">${this._error}</div>` : ""}
      <div class="source grid" tabindex="0" @click=${this._showManageGrid}>
        <div class="icon">
          <ha-svg-icon .path=${mdiTransmissionTower}></ha-svg-icon>
        </div>
        ${gridSource
          ? html`
              <div class="text">
                <div class="title">Configure Grid</div>
                <div class="description">
                  Change the monitoring data for your grid.
                </div>
              </div>
            `
          : html`
              <div class="text">
                <div class="title">Set up Grid</div>
                <div class="description">
                  Monitor the energy consumed from the grid.
                </div>
              </div>
            `}
        <div class="meta"><ha-icon-next></ha-icon-next></div>
      </div>

      <div class="source solar" tabindex="0" @click=${this._showManageSolar}>
        <div class="icon">
          <ha-svg-icon .path=${mdiSolarPower}></ha-svg-icon>
        </div>
        ${solarSource
          ? html`
              <div class="text">
                <div class="title">Configure Solar Panels</div>
                <div class="description">Update your solar panels</div>
              </div>
            `
          : html`
              <div class="text">
                <div class="title">Add Solar Panels</div>
                <div class="description">
                  Monitor production and help time your usage.
                </div>
              </div>
            `}
        <div class="meta"><ha-icon-next></ha-icon-next></div>
      </div>

      <div
        class="source devices"
        tabindex="0"
        @click=${this._showManageDevices}
      >
        <div class="icon">
          <ha-svg-icon .path=${mdiWashingMachine}></ha-svg-icon>
        </div>
        ${this.preferences.device_consumption.length
          ? html`
              <div class="text">
                <div class="title">Configure Individual Devices</div>
                <div class="description">
                  Add the energy usage of individual devices.
                </div>
              </div>
            `
          : html`
              <div class="text">
                <div class="title">Monitor Individual devices</div>
                <div class="description">
                  Add plugs with power usage to track individual device usage.
                </div>
              </div>
            `}
        <div class="meta"><ha-icon-next></ha-icon-next></div>
      </div>
    `;
  }

  private _renderManageGrid() {
    const types = energySourcesByType(this.preferences);

    const gridSource = types.grid
      ? { ...types.grid[0] }
      : emptyGridSourceEnergyPreference();
    let emptyFlowFrom = false;
    let emptyFlowTo = false;

    if (gridSource.flow_from.length === 0) {
      emptyFlowFrom = true;
      gridSource.flow_from = [emptyFlowFromGridSourceEnergyPreference()];
    }

    if (gridSource.flow_to.length === 0) {
      emptyFlowTo = true;
      gridSource.flow_to = [emptyFlowToGridSourceEnergyPreference()];
    }

    return html`
      <div class="manage">
        <h2>${gridSource ? "Set up the grid" : "Manage the grid"}</h2>

        <h3>Consumption</h3>

        ${gridSource.flow_from.map(
          (flow, idx) => html`
            <ha-statistic-picker
              .prefType=${"source"}
              .sourceType=${"grid"}
              .flowType=${"from"}
              .flowIdx=${idx}
              .flowStat=${"energy_from"}
              .hass=${this.hass}
              .statisticIds=${this._statisticIds}
              .includeUnitOfMeasurement=${energyUnits}
              .value=${flow.stat_energy_from}
              .label=${`${idx + 1}: Grid Energy Consumption (kWh)`}
              @value-changed=${this._valueChanged}
            ></ha-statistic-picker>

            <ha-statistic-picker
              .prefType=${"source"}
              .sourceType=${"grid"}
              .flowType=${"from"}
              .flowIdx=${idx}
              .flowStat=${"cost"}
              .hass=${this.hass}
              .statisticIds=${this._statisticIds}
              .value=${flow.stat_cost}
              .label=${`${idx + 1}: Grid Energy Consumption Cost`}
              @value-changed=${this._valueChanged}
            ></ha-statistic-picker>
          `
        )}
        ${emptyFlowFrom
          ? ""
          : html`
              <div>
                <mwc-button @click=${this._gridAddFlowFrom}
                  >Add one more</mwc-button
                >
              </div>
            `}

        <h3>Return to grid</h3>
        ${gridSource.flow_to.map(
          (flow, idx) => html`
            <ha-statistic-picker
              .prefType=${"source"}
              .sourceType=${"grid"}
              .flowType=${"to"}
              .flowIdx=${idx}
              .flowStat=${"energy_to"}
              .hass=${this.hass}
              .statisticIds=${this._statisticIds}
              .includeUnitOfMeasurement=${energyUnits}
              .value=${flow.stat_energy_to}
              label="Returned to Grid (kWh)"
              @value-changed=${this._valueChanged}
            ></ha-statistic-picker>
          `
        )}
        ${emptyFlowTo
          ? ""
          : html`
              <div>
                <mwc-button @click=${this._gridAddFlowTo}
                  >Add one more</mwc-button
                >
              </div>
            `}

        <div class="finish">
          <mwc-button @click=${this._showOverview}>Back</mwc-button>
        </div>
      </div>
    `;
  }

  private _renderManageSolar() {
    const types = energySourcesByType(this.preferences);

    const solarSource = types.solar ? types.solar[0] : undefined;

    return html`
      <div class="manage">
        <h2>${solarSource ? "Set up solar" : "Manage solar"}</h2>

        <ha-statistic-picker
          .prefType=${"source"}
          .sourceType=${"solar"}
          .stat=${"energy_from"}
          .hass=${this.hass}
          .statisticIds=${this._statisticIds}
          .includeUnitOfMeasurement=${energyUnits}
          .value=${solarSource?.stat_energy_from}
          .label=${this.hass.localize(
            "ui.panel.energy.settings.production.stat_production"
          )}
          @value-changed=${this._valueChanged}
        ></ha-statistic-picker>
        <ha-statistic-picker
          .prefType=${"source"}
          .sourceType=${"solar"}
          .stat=${"predicted_energy_from"}
          .hass=${this.hass}
          .statisticIds=${this._statisticIds}
          .includeUnitOfMeasurement=${energyUnits}
          .value=${solarSource?.stat_predicted_energy_from}
          .label=${this.hass.localize(
            "ui.panel.energy.settings.production.stat_predicted_production"
          )}
          @value-changed=${this._valueChanged}
        ></ha-statistic-picker>

        <div class="finish">
          <mwc-button @click=${this._showOverview}>Back</mwc-button>
        </div>
      </div>
    `;
  }

  private _renderManageDevices() {
    return html`
      <div class="manage">
        <h2>
          ${this.preferences.device_consumption.length
            ? "Manage Devices"
            : "Add Devices"}
        </h2>

        ${this.hass.localize(
          "ui.panel.energy.settings.device_consumption.description"
        )}
        <ha-statistics-picker
          .prefType=${"device"}
          .hass=${this.hass}
          .value=${this.preferences.device_consumption.map(
            (pref) => pref.stat_consumption
          )}
          .statisticIds=${this._statisticIds}
          .includeUnitOfMeasurement=${energyUnits}
          .pickedStatisticLabel=${this.hass.localize(
            "ui.panel.energy.settings.device_consumption.selected_stat"
          )}
          .pickStatisticLabel=${this.hass.localize(
            "ui.panel.energy.settings.device_consumption.add_stat"
          )}
          @value-changed=${this._valueChanged}
        >
        </ha-statistics-picker>

        <div class="finish">
          <mwc-button @click=${this._showOverview}>Back</mwc-button>
        </div>
      </div>
    `;
  }

  private _showOverview() {
    this._state = "overview";
  }

  private _showManageGrid() {
    this._state = "manage_grid";
  }

  private _showManageSolar() {
    this._state = "manage_solar";
  }

  private _showManageDevices() {
    this._state = "manage_devices";
  }

  private async _getStatisticIds() {
    this._statisticIds = await getStatisticIds(this.hass);
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();

    const target = ev.target! as HTMLElement;

    // Process value
    let value: string[] | string | number | undefined | null = ev.detail.value;

    if (value === "") {
      value = null;
    }

    if (value !== null && (target as PaperInputElement).type === "number") {
      value = Number(value);
    }

    const preferences = { ...this.preferences };

    // Find preference to update
    const prefType = (target as any).prefType as "source" | "device";

    if (prefType === "device") {
      preferences.device_consumption = (value as string[]).map((val) => ({
        stat_consumption: val,
      }));
      this._setPreferences(preferences);
      return;
    }

    const sourceType = (target as any).sourceType as "grid" | "solar";

    preferences.energy_sources = [...preferences.energy_sources];
    // We only have one of each source
    let idxToUpdate = preferences.energy_sources.findIndex(
      (source) => source.type === sourceType
    );

    if (idxToUpdate === -1) {
      idxToUpdate = preferences.energy_sources.length;
      preferences.energy_sources.push(
        sourceType === "grid"
          ? emptyGridSourceEnergyPreference()
          : emptySolarEnergyPreference()
      );
    }

    preferences.energy_sources[idxToUpdate] = {
      ...preferences.energy_sources[idxToUpdate],
    };
    const sourceToUpdate = preferences.energy_sources[idxToUpdate];

    if (sourceToUpdate.type === "solar") {
      const stat = (target as any).stat as "from" | "predirected_from";
      sourceToUpdate[`stat_${stat}`] = value;
      this._setPreferences(preferences);
      return;
    }

    // grid source
    const flowType = (target as any).flowType as "from" | "to";
    const flowIdx = (target as any).flowIdx as number;
    const flowStat = (target as any).flowStat as "from" | "cost";

    if (flowType === "from") {
      sourceToUpdate.flow_from = [...sourceToUpdate.flow_from];
      if (sourceToUpdate.flow_from[flowIdx] === undefined) {
        sourceToUpdate.flow_from[flowIdx] =
          emptyFlowFromGridSourceEnergyPreference();
      }
      sourceToUpdate.flow_from[flowIdx] = {
        ...sourceToUpdate.flow_from[flowIdx],
        [`stat_${flowStat}`]: value,
      };
    } else {
      sourceToUpdate.flow_to = [...sourceToUpdate.flow_to];
      if (sourceToUpdate.flow_to[flowIdx] === undefined) {
        sourceToUpdate.flow_to[flowIdx] =
          emptyFlowToGridSourceEnergyPreference();
      }
      sourceToUpdate.flow_to[flowIdx] = {
        ...sourceToUpdate.flow_to[flowIdx],
        [`stat_${flowStat}`]: value,
      };
    }

    this._setPreferences(preferences);
  }

  private _gridAddFlowFrom() {
    const preferences = { ...this.preferences };
    const gridIdx = preferences.energy_sources.findIndex(
      (source) => source.type === "grid"
    );
    const source = {
      ...preferences.energy_sources[gridIdx],
    } as GridSourceTypeEnergyPreference;
    source.flow_from = [
      ...source.flow_from,
      emptyFlowFromGridSourceEnergyPreference(),
    ];
    preferences.energy_sources[gridIdx] = source;
    this._setPreferences(preferences);
  }

  private _gridAddFlowTo() {
    const preferences = { ...this.preferences };
    const gridIdx = preferences.energy_sources.findIndex(
      (source) => source.type === "grid"
    );
    const source = {
      ...preferences.energy_sources[gridIdx],
    } as GridSourceTypeEnergyPreference;
    source.flow_to = [
      ...source.flow_to,
      emptyFlowToGridSourceEnergyPreference(),
    ];
    preferences.energy_sources[gridIdx] = source;
    this._setPreferences(preferences);
  }

  private _setPreferences(preferences: EnergyPreferences) {
    this.preferences = preferences;
    fireEvent(this, "value-changed", { value: preferences });
  }

  public async savePreferences() {
    if (!this.preferences) {
      return;
    }
    try {
      await saveEnergyPreferences(this.hass, this.preferences);
    } catch (err) {
      this._error = `Failed to save config: ${err.message}`;
      throw err;
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      .error {
        color: var(--error-color);
      }
      .source,
      .manage {
        max-width: 550px;
        margin: 0 auto;
      }
      .source {
        display: flex;
        max-width: 550px;
        margin: 8px auto 0;
        align-items: center;
        cursor: pointer;
      }
      .source ha-svg-icon {
        width: 40px;
        height: 40px;
        margin: 8px;
      }
      .source .text {
        flex: 1;
        margin: 0 8px 0 16px;
      }
      .source .title {
        font-weight: bold;
      }
      .manage .finish {
        margin-top: 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-settings": EnergySettings;
  }
}
