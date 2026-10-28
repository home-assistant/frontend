import "@home-assistant/webawesome/dist/components/divider/divider";
import type { ContextType } from "@lit/context";
import type { CSSResultGroup, PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-alert";
import "../../../../components/input/ha-input";
import type { HaInput } from "../../../../components/input/ha-input";
import type {
  BatterySourceTypeEnergyPreference,
  PowerConfig,
} from "../../../../data/energy";
import {
  computeEnergyLabel,
  emptyBatteryEnergyPreference,
  energyStatisticHelpUrl,
} from "../../../../data/energy";
import {
  getStatisticLabel,
  getStatisticMetadata,
  isExternalStatistic,
} from "../../../../data/recorder";
import { getSensorDeviceClassConvertibleUnits } from "../../../../data/sensor";
import { entitiesContext, statesContext } from "../../../../data/context";
import { DirtyStateProviderMixin } from "../../../../mixins/dirty-state-provider-mixin";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import type { PowerIntegral } from "../dialogs/energy-integral";
import {
  confirmIntegrals,
  pendingPowerIntegrals,
} from "../dialogs/energy-integral";
import "../dialogs/ha-energy-power-config";
import {
  buildPowerExcludeList,
  getInitialPowerConfig,
  getPowerHelperEntityId,
  getPowerTypeFromConfig,
  isPowerConfigValid,
  type PowerType,
} from "../dialogs/power-config";
import type {
  EnergyBatterySourceEditorParams,
  EnergyEditorStatus,
} from "./energy-editor";
import { EnergyEditorMixin, energyEditorStyles } from "./energy-editor";

interface BatteryFormState {
  source: BatterySourceTypeEnergyPreference;
  powerType: PowerType;
  powerConfig: PowerConfig;
}

const energyUnitClasses = ["energy"];
const socStatisticsUnits = ["%"];
const socDeviceClass = "battery";

@customElement("ha-energy-battery-source-editor")
export class HaEnergyBatterySourceEditor extends EnergyEditorMixin(
  DirtyStateProviderMixin<BatteryFormState>()(LitElement)
) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public params!: EnergyBatterySourceEditorParams;

  // Live, so a retry finds the helpers already created
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @consume({ context: entitiesContext, subscribe: true })
  private _entities!: ContextType<typeof entitiesContext>;

  @state() private _source?: BatterySourceTypeEnergyPreference;

  @state() private _powerType: PowerType = "none";

  @state() private _powerConfig: PowerConfig = {};

  @state() private _energy_units?: string[];

  @state() private _error?: string;

  @state() private _saving = false;

  private _excludeList?: string[];

  private _excludeListPower?: string[];

  protected willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);
    if (changedProps.has("params")) {
      this._init();
    }
  }

  private _init() {
    const params = this.params;
    this._error = undefined;
    this._saving = false;
    this._source = params.source
      ? { ...params.source }
      : emptyBatteryEnergyPreference();

    this._powerType = getPowerTypeFromConfig(
      params.source?.power_config,
      params.source?.stat_rate
    );
    this._powerConfig = getInitialPowerConfig(
      params.source?.power_config,
      params.source?.stat_rate
    );

    const allSources: string[] = [];
    params.battery_sources.forEach((entry) => {
      allSources.push(entry.stat_energy_from);
      allSources.push(entry.stat_energy_to);
    });
    this._excludeList = allSources.filter(
      (id) =>
        id !== this._source?.stat_energy_from &&
        id !== this._source?.stat_energy_to
    );

    this._excludeListPower = buildPowerExcludeList(
      params.battery_sources,
      this._powerConfig,
      params.source?.stat_rate
    );

    this._initDirtyTracking(
      { type: "deep" },
      {
        source: this._source,
        powerType: this._powerType,
        powerConfig: this._powerConfig,
      }
    );
    this._loadUnits();
  }

  private async _loadUnits() {
    this._energy_units = (
      await getSensorDeviceClassConvertibleUnits(this.hass, "energy")
    ).units;
  }

  protected get editorStatus(): EnergyEditorStatus {
    return {
      dirty: this.isDirtyState,
      valid: this._isValid(this._pendingIntegrals()),
      saving: this._saving,
    };
  }

  protected render() {
    if (!this._source) {
      return nothing;
    }

    const pending = this._pendingIntegrals();
    const labelStatistic =
      this._source.stat_energy_from ||
      this._source.stat_energy_to ||
      pending[0]?.rate;

    return html`
      ${
        this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing
      }
      <div class="group">
        <ha-statistic-picker
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          .includeUnitClass=${energyUnitClasses}
          .value=${this._source.stat_energy_from}
          .label=${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.energy_out_of_battery"
          )}
          .excludeStatistics=${[
            ...(this._excludeList || []),
            this._source.stat_energy_to,
          ]}
          @value-changed=${this._statisticFromChanged}
          .disabled=${this._saving}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.energy_helper_out",
            { unit: this._energy_units?.join(", ") || "" }
          )}
        ></ha-statistic-picker>
        <ha-statistic-picker
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          .includeUnitClass=${energyUnitClasses}
          .value=${this._source.stat_energy_to}
          .label=${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.energy_into_battery"
          )}
          .excludeStatistics=${[
            ...(this._excludeList || []),
            this._source.stat_energy_from,
          ]}
          @value-changed=${this._statisticToChanged}
          .disabled=${this._saving}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.energy_helper_into",
            { unit: this._energy_units?.join(", ") || "" }
          )}
        ></ha-statistic-picker>
        <ha-input
          .label=${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.display_name"
          )}
          type="text"
          .disabled=${!labelStatistic || this._saving}
          .value=${this._source.name || ""}
          .placeholder=${
            labelStatistic
              ? getStatisticLabel(
                  this.hass.states,
                  this.hass.formatEntityName,
                  labelStatistic,
                  this.params.statsMetadata?.[labelStatistic]
                )
              : ""
          }
          @input=${this._nameChanged}
        >
        </ha-input>
      </div>

      <wa-divider></wa-divider>

      <ha-energy-power-config
        .hass=${this.hass}
        .powerType=${this._powerType}
        .powerConfig=${this._powerConfig}
        .excludeList=${this._excludeListPower}
        .helperEntityId=${getPowerHelperEntityId(
          this.params.source,
          this._powerConfig
        )}
        .localizeBaseKey=${"ui.panel.config.energy.battery.dialog"}
        .disabled=${this._saving}
        @power-config-changed=${this._handlePowerConfigChanged}
      ></ha-energy-power-config>

      <wa-divider></wa-divider>

      <div class="group">
        <ha-statistic-picker
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          .value=${this._source.stat_soc}
          .includeStatisticsUnitOfMeasurement=${socStatisticsUnits}
          .includeDeviceClass=${socDeviceClass}
          .label=${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.state_of_charge"
          )}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.state_of_charge_helper"
          )}
          @value-changed=${this._statisticSocChanged}
          .disabled=${this._saving}
        ></ha-statistic-picker>
        <ha-input
          .value=${
            this._source.capacity != null ? String(this._source.capacity) : ""
          }
          .label=${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.capacity"
          )}
          .hint=${this.hass.localize(
            "ui.panel.config.energy.battery.dialog.capacity_helper"
          )}
          type="number"
          step="any"
          min="0"
          @input=${this._capacityChanged}
          .disabled=${this._saving}
        >
          <span slot="end">kWh</span>
        </ha-input>
      </div>
    `;
  }

  private _isValid(pending: PowerIntegral[]): boolean {
    // Energy fields are always required, but power sensors can provide them
    const isProvided = (energy: PowerIntegral["energy"]) =>
      !!this._source?.[energy] ||
      pending.some((item) => item.energy === energy);
    if (!isProvided("stat_energy_from") || !isProvided("stat_energy_to")) {
      return false;
    }

    return isPowerConfigValid(this._powerType, this._powerConfig);
  }

  private async _updateMetadata(statId: string) {
    if (
      statId &&
      isExternalStatistic(statId) &&
      this.params.statsMetadata &&
      !(statId in this.params.statsMetadata)
    ) {
      const [metadata] = await getStatisticMetadata(this.hass.callWS, [statId]);
      if (metadata) {
        this.params.statsMetadata[statId] = metadata;
        this.requestUpdate();
      }
    }
  }

  private _statisticToChanged(ev: ValueChangedEvent<string>) {
    this._source = { ...this._source!, stat_energy_to: ev.detail.value };
    this._updateMetadata(ev.detail.value);
    this._updateFormDirtyState();
  }

  private _statisticFromChanged(ev: ValueChangedEvent<string>) {
    this._source = { ...this._source!, stat_energy_from: ev.detail.value };
    this._updateMetadata(ev.detail.value);
    this._updateFormDirtyState();
  }

  private _nameChanged(ev: InputEvent) {
    this._source = {
      ...this._source!,
      name: (ev.target as HaInput).value,
    };
    if (!this._source.name) {
      delete this._source.name;
    }
    this._updateFormDirtyState();
  }

  private _handlePowerConfigChanged(
    ev: HASSDomEvent<HASSDomEvents["power-config-changed"]>
  ) {
    this._powerType = ev.detail.powerType;
    this._powerConfig = ev.detail.powerConfig;
    this._updateFormDirtyState();
  }

  private _statisticSocChanged(ev: ValueChangedEvent<string>) {
    this._source = {
      ...this._source!,
      stat_soc: ev.detail.value || undefined,
    };
    this._updateFormDirtyState();
  }

  private _updateFormDirtyState(): void {
    this._updateDirtyState({
      source: this._source!,
      powerType: this._powerType,
      powerConfig: this._powerConfig,
    });
  }

  private _capacityChanged(ev: InputEvent) {
    const rawValue = (ev.target as HaInput).value;
    const value = rawValue ? parseFloat(rawValue) : NaN;
    this._source = {
      ...this._source!,
      capacity: Number.isFinite(value) && value > 0 ? value : undefined,
    };
    if (this._source.capacity === undefined) {
      delete this._source.capacity;
    }
    this._updateFormDirtyState();
  }

  private _pendingIntegrals(): PowerIntegral[] {
    if (!this._source || !this._energy_units) {
      return [];
    }
    return pendingPowerIntegrals(
      this.hass.states,
      this._source,
      this._powerType,
      this._powerConfig,
      this._energy_units
    );
  }

  public async save(): Promise<boolean> {
    // The editor can be replaced while saving, but created helpers must still
    // be saved with the submitted source
    const params = this.params;
    const powerType = this._powerType;
    const powerConfig = this._powerConfig;
    let draft = this._source!;
    const isCurrent = () => this.params === params && this.isConnected;
    this._error = undefined;
    this._saving = true;
    try {
      const pending = this._pendingIntegrals();
      if (pending.length) {
        const sensors = await this._energyFromPower(draft, pending);
        if (!sensors) {
          return false;
        }
        const created = Object.fromEntries(
          pending.map(({ energy }, index) => [energy, sensors[index]])
        );
        draft = { ...draft, ...created };
        if (isCurrent()) {
          // Keep edits made meanwhile, only fill in the new energy sensors
          this._source = { ...this._source!, ...created };
          this._updateFormDirtyState();
        }
      }

      const source: BatterySourceTypeEnergyPreference = {
        type: "battery",
        stat_energy_from: draft.stat_energy_from,
        stat_energy_to: draft.stat_energy_to,
      };
      if (draft.name) {
        source.name = draft.name;
      }

      if (powerType !== "none") {
        source.power_config = { ...powerConfig };
      }

      if (draft.stat_soc) {
        source.stat_soc = draft.stat_soc;
      }

      if (draft.capacity != null) {
        source.capacity = draft.capacity;
      }

      await params.saveCallback(source);
      if (isCurrent()) {
        this._markDirtyStateClean();
      }
      return true;
    } catch (err: any) {
      if (isCurrent()) {
        this._error = err.message;
      }
      return false;
    } finally {
      if (isCurrent()) {
        this._saving = false;
      }
    }
  }

  private _energyFromPower(
    draft: BatterySourceTypeEnergyPreference,
    pending: PowerIntegral[]
  ): Promise<string[] | undefined> {
    return confirmIntegrals(this, this.hass, {
      deviceClass: "energy",
      states: this._states,
      entities: this._entities,
      requests: pending.map(({ energy, rate, units }) => ({
        rate,
        units,
        name: this.hass.localize(
          energy === "stat_energy_from"
            ? "ui.panel.config.energy.battery.dialog.discharged_energy_name"
            : "ui.panel.config.energy.battery.dialog.charged_energy_name",
          {
            name: computeEnergyLabel(
              this.hass.states,
              this.hass.formatEntityName,
              rate,
              this.params.statsMetadata?.[rate],
              draft.name
            ),
          }
        ),
      })),
      intro: this.hass.localize(
        "ui.panel.config.energy.battery.dialog.energy_sensors_needed"
      ),
      // Neither direction may reuse the statistic of the other
      exclude: [
        ...(this._excludeList || []),
        draft.stat_energy_from,
        draft.stat_energy_to,
      ].filter((id): id is string => Boolean(id)),
      statsMetadata: this.params.statsMetadata,
    });
  }

  static get styles(): CSSResultGroup {
    return energyEditorStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-battery-source-editor": HaEnergyBatterySourceEditor;
  }
}
