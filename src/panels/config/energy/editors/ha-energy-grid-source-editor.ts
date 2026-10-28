import "@home-assistant/webawesome/dist/components/divider/divider";
import type { ContextType } from "@lit/context";
import type { CSSResultGroup, PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import type {
  HASSDomCurrentTargetEvent,
  HASSDomEvent,
} from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-alert";
import "../../../../components/ha-select";
import type {
  HaSelectOption,
  HaSelectSelectEvent,
} from "../../../../components/ha-select";
import "../../../../components/input/ha-input";
import type { HaInput } from "../../../../components/input/ha-input";
import type {
  GridSourceTypeEnergyPreference,
  PowerConfig,
} from "../../../../data/energy";
import {
  computeEnergyLabel,
  emptyGridSourceEnergyPreference,
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
  EnergyEditorStatus,
  EnergyGridSourceEditorParams,
} from "./energy-editor";
import { EnergyEditorMixin, energyEditorStyles } from "./energy-editor";

const energyUnitClasses = ["energy"];

type CostType = "no_cost" | "stat" | "entity" | "number";

interface GridFormState {
  source: GridSourceTypeEnergyPreference;
  powerType: PowerType;
  powerConfig: PowerConfig;
  importCostType: CostType;
  exportCostType: CostType;
}

@customElement("ha-energy-grid-source-editor")
export class HaEnergyGridSourceEditor extends EnergyEditorMixin(
  DirtyStateProviderMixin<GridFormState>()(LitElement)
) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public params!: EnergyGridSourceEditorParams;

  // Live, so a retry finds the helpers already created
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @consume({ context: entitiesContext, subscribe: true })
  private _entities!: ContextType<typeof entitiesContext>;

  @state() private _source?: GridSourceTypeEnergyPreference;

  @state() private _powerType: PowerType = "none";

  @state() private _powerConfig: PowerConfig = {};

  @state() private _importCostType: CostType = "no_cost";

  @state() private _exportCostType: CostType = "no_cost";

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
      : emptyGridSourceEnergyPreference();

    this._powerType = getPowerTypeFromConfig(
      params.source?.power_config,
      params.source?.stat_rate
    );
    this._powerConfig = getInitialPowerConfig(
      params.source?.power_config,
      params.source?.stat_rate
    );

    if (params.source?.stat_cost) {
      this._importCostType = "stat";
    } else if (params.source?.entity_energy_price) {
      this._importCostType = "entity";
    } else if (
      params.source?.number_energy_price !== null &&
      params.source?.number_energy_price !== undefined
    ) {
      this._importCostType = "number";
    } else {
      this._importCostType = "no_cost";
    }

    if (params.source?.stat_compensation) {
      this._exportCostType = "stat";
    } else if (params.source?.entity_energy_price_export) {
      this._exportCostType = "entity";
    } else if (
      params.source?.number_energy_price_export !== null &&
      params.source?.number_energy_price_export !== undefined
    ) {
      this._exportCostType = "number";
    } else {
      this._exportCostType = "no_cost";
    }

    const allSources: string[] = [];
    params.grid_sources.forEach((entry) => {
      if (entry.stat_energy_from) allSources.push(entry.stat_energy_from);
      if (entry.stat_energy_to) allSources.push(entry.stat_energy_to);
    });
    this._excludeList = allSources.filter(
      (id) =>
        id !== this._source?.stat_energy_from &&
        id !== this._source?.stat_energy_to
    );

    this._excludeListPower = buildPowerExcludeList(
      params.grid_sources,
      this._powerConfig,
      params.source?.stat_rate
    );

    this._initDirtyTracking(
      { type: "deep" },
      {
        source: this._source,
        powerType: this._powerType,
        powerConfig: this._powerConfig,
        importCostType: this._importCostType,
        exportCostType: this._exportCostType,
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
    const pending = this._pendingIntegrals();
    return {
      dirty: this.isDirtyState || (!!this.params.source && !!pending.length),
      valid: this._isValid(pending),
      saving: this._saving,
    };
  }

  protected render() {
    if (!this._source) {
      return nothing;
    }

    const pending = this._pendingIntegrals();
    const hasExport = this._hasExport(pending);
    const labelStatistic =
      this._source.stat_energy_from ||
      this._source.stat_energy_to ||
      pending[0]?.rate;

    // External statistics (from integrations) cannot use entity/number cost tracking
    const externalImportSource =
      !!this._source.stat_energy_from &&
      isExternalStatistic(this._source.stat_energy_from);
    const externalExportSource =
      !!this._source.stat_energy_to &&
      isExternalStatistic(this._source.stat_energy_to);

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
            "ui.panel.config.energy.grid.dialog.energy_from_grid"
          )}
          .excludeStatistics=${[
            ...(this._excludeList || []),
            this._source.stat_energy_to,
          ].filter((id): id is string => Boolean(id))}
          @value-changed=${this._statisticFromChanged}
          .disabled=${this._saving}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.grid.dialog.energy_from_helper",
            { unit: this._energy_units?.join(", ") || "" }
          )}
        ></ha-statistic-picker>
        <ha-statistic-picker
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          .includeUnitClass=${energyUnitClasses}
          .value=${this._source.stat_energy_to}
          .label=${this.hass.localize(
            "ui.panel.config.energy.grid.dialog.energy_to_grid"
          )}
          .excludeStatistics=${[
            ...(this._excludeList || []),
            this._source.stat_energy_from,
          ].filter((id): id is string => Boolean(id))}
          @value-changed=${this._statisticToChanged}
          .disabled=${this._saving}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.grid.dialog.energy_to_helper",
            { unit: this._energy_units?.join(", ") || "" }
          )}
        ></ha-statistic-picker>
        <ha-input
          .label=${this.hass.localize(
            "ui.panel.config.energy.grid.dialog.display_name"
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
        class="group"
        .hass=${this.hass}
        .powerType=${this._powerType}
        .powerConfig=${this._powerConfig}
        .excludeList=${this._excludeListPower}
        .helperEntityId=${getPowerHelperEntityId(
          this.params.source,
          this._powerConfig
        )}
        .localizeBaseKey=${"ui.panel.config.energy.grid.dialog"}
        .disabled=${this._saving}
        @power-config-changed=${this._handlePowerConfigChanged}
      ></ha-energy-power-config>

      <wa-divider></wa-divider>

      <div class="group">
        <ha-select
          .label=${this.hass.localize(
            "ui.panel.config.energy.grid.dialog.import_cost"
          )}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.grid.dialog.import_cost_para"
          )}
          .value=${this._importCostType}
          .options=${this._costOptions(externalImportSource, "import")}
          .disabled=${this._saving}
          @selected=${this._handleImportCostTypeChanged}
        ></ha-select>
        ${this._renderImportCost()}
      </div>

      ${
        hasExport
          ? html`
              <wa-divider></wa-divider>
              <div class="group">
                <ha-select
                  .label=${this.hass.localize(
                    "ui.panel.config.energy.grid.dialog.export_compensation"
                  )}
                  .helper=${this.hass.localize(
                    "ui.panel.config.energy.grid.dialog.export_compensation_para"
                  )}
                  .value=${this._exportCostType}
                  .options=${this._costOptions(externalExportSource, "export")}
                  .disabled=${this._saving}
                  @selected=${this._handleExportCostTypeChanged}
                ></ha-select>
                ${this._renderExportCompensation()}
              </div>
            `
          : nothing
      }
    `;
  }

  private _costOptions(
    externalSource: boolean,
    direction: "import" | "export"
  ): HaSelectOption[] {
    const key = "ui.panel.config.energy.grid.dialog";
    const labels =
      direction === "import"
        ? {
            no_cost: this.hass.localize(`${key}.no_cost_tracking`),
            stat: this.hass.localize(`${key}.cost_stat`),
            entity: this.hass.localize(`${key}.cost_entity`),
            number: this.hass.localize(`${key}.cost_number`),
          }
        : {
            no_cost: this.hass.localize(`${key}.no_compensation_tracking`),
            stat: this.hass.localize(`${key}.compensation_stat`),
            entity: this.hass.localize(`${key}.compensation_entity`),
            number: this.hass.localize(`${key}.compensation_number`),
          };
    return [
      { value: "no_cost", label: labels.no_cost },
      { value: "stat", label: labels.stat },
      { value: "entity", label: labels.entity, disabled: externalSource },
      { value: "number", label: labels.number, disabled: externalSource },
    ];
  }

  private _renderImportCost() {
    switch (this._importCostType) {
      case "stat":
        return html`
          <ha-statistic-picker
            .disabled=${this._saving}
            .value=${this._source!.stat_cost}
            .label=${this.hass.localize(
              "ui.panel.config.energy.grid.dialog.cost_stat_label"
            )}
            @value-changed=${this._statCostChanged}
          ></ha-statistic-picker>
        `;
      case "entity":
        return html`
          <ha-entity-picker
            .disabled=${this._saving}
            .value=${this._source!.entity_energy_price}
            .label=${this.hass.localize(
              "ui.panel.config.energy.grid.dialog.cost_entity_label"
            )}
            include-domains='["sensor", "input_number"]'
            @value-changed=${this._entityCostChanged}
          ></ha-entity-picker>
        `;
      case "number":
        return html`
          <ha-input
            .disabled=${this._saving}
            .value=${
              this._source!.number_energy_price !== null
                ? String(this._source!.number_energy_price)
                : ""
            }
            .label=${this.hass.localize(
              "ui.panel.config.energy.grid.dialog.cost_number_label"
            )}
            type="number"
            step="any"
            required
            auto-validate
            @input=${this._numberCostChanged}
          >
            <span slot="end">${this.hass.config.currency}/kWh</span>
          </ha-input>
        `;
      default:
        return nothing;
    }
  }

  private _renderExportCompensation() {
    switch (this._exportCostType) {
      case "stat":
        return html`
          <ha-statistic-picker
            .disabled=${this._saving}
            .value=${this._source!.stat_compensation}
            .label=${this.hass.localize(
              "ui.panel.config.energy.grid.dialog.compensation_stat_label"
            )}
            @value-changed=${this._statCompensationChanged}
          ></ha-statistic-picker>
        `;
      case "entity":
        return html`
          <ha-entity-picker
            .disabled=${this._saving}
            .value=${this._source!.entity_energy_price_export}
            .label=${this.hass.localize(
              "ui.panel.config.energy.grid.dialog.compensation_entity_label"
            )}
            include-domains='["sensor", "input_number"]'
            @value-changed=${this._entityCompensationChanged}
          ></ha-entity-picker>
        `;
      case "number":
        return html`
          <ha-input
            .disabled=${this._saving}
            .value=${
              this._source!.number_energy_price_export !== null
                ? String(this._source!.number_energy_price_export)
                : ""
            }
            .label=${this.hass.localize(
              "ui.panel.config.energy.grid.dialog.compensation_number_label"
            )}
            type="number"
            step="any"
            required
            auto-validate
            @input=${this._numberCompensationChanged}
          >
            <span slot="end">${this.hass.config.currency}/kWh</span>
          </ha-input>
        `;
      default:
        return nothing;
    }
  }

  private _hasExport(pending: PowerIntegral[]): boolean {
    return (
      !!this._source?.stat_energy_to ||
      pending.some(({ energy }) => energy === "stat_energy_to")
    );
  }

  private _isValid(pending: PowerIntegral[]): boolean {
    // Grid must have at least one of: import, export, or power
    const hasImport = !!this._source?.stat_energy_from;
    const hasExport = this._hasExport(pending);
    const hasPower = this._powerType !== "none";

    if (!hasImport && !hasExport && !hasPower) {
      return false;
    }

    if (hasPower && !isPowerConfigValid(this._powerType, this._powerConfig)) {
      return false;
    }

    if (
      this._importCostType === "number" &&
      typeof this._source?.number_energy_price !== "number"
    ) {
      return false;
    }

    if (
      hasExport &&
      this._exportCostType === "number" &&
      typeof this._source?.number_energy_price_export !== "number"
    ) {
      return false;
    }

    return true;
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

  private _statisticFromChanged(ev: ValueChangedEvent<string>) {
    this._source = { ...this._source!, stat_energy_from: ev.detail.value };
    // Reset cost type if switching to external statistic with incompatible cost type
    if (
      ev.detail.value &&
      isExternalStatistic(ev.detail.value) &&
      (this._importCostType === "entity" || this._importCostType === "number")
    ) {
      this._importCostType = "no_cost";
      this._source = {
        ...this._source,
        entity_energy_price: null,
        number_energy_price: null,
      };
    }
    this._updateMetadata(ev.detail.value);
    this._updateFormDirtyState();
  }

  private _statisticToChanged(ev: ValueChangedEvent<string>) {
    this._source = {
      ...this._source!,
      stat_energy_to: ev.detail.value || null,
    };
    // Clear export cost if export is removed
    if (!ev.detail.value) {
      this._exportCostType = "no_cost";
      this._source = {
        ...this._source,
        stat_compensation: null,
        entity_energy_price_export: null,
        number_energy_price_export: null,
      };
    } else if (
      // Reset cost type if switching to external statistic with incompatible cost type
      isExternalStatistic(ev.detail.value) &&
      (this._exportCostType === "entity" || this._exportCostType === "number")
    ) {
      this._exportCostType = "no_cost";
      this._source = {
        ...this._source,
        entity_energy_price_export: null,
        number_energy_price_export: null,
      };
    }
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

  private _handleImportCostTypeChanged(ev: HaSelectSelectEvent) {
    this._importCostType = ev.detail.value as CostType;
    // Clear other cost fields when switching types
    this._source = {
      ...this._source!,
      stat_cost: null,
      entity_energy_price: null,
      number_energy_price: null,
    };
    this._updateFormDirtyState();
  }

  private _handleExportCostTypeChanged(ev: HaSelectSelectEvent) {
    this._exportCostType = ev.detail.value as CostType;
    // Clear other cost fields when switching types
    this._source = {
      ...this._source!,
      stat_compensation: null,
      entity_energy_price_export: null,
      number_energy_price_export: null,
    };
    this._updateFormDirtyState();
  }

  private _statCostChanged(ev: ValueChangedEvent<string>) {
    this._source = { ...this._source!, stat_cost: ev.detail.value || null };
    this._updateFormDirtyState();
  }

  private _entityCostChanged(ev: ValueChangedEvent<string>) {
    this._source = {
      ...this._source!,
      entity_energy_price: ev.detail.value || null,
    };
    this._updateFormDirtyState();
  }

  private _numberCostChanged(ev: HASSDomCurrentTargetEvent<HaInput>) {
    const value = ev.currentTarget.value
      ? parseFloat(ev.currentTarget.value)
      : null;
    this._source = { ...this._source!, number_energy_price: value };
    this._updateFormDirtyState();
  }

  private _statCompensationChanged(ev: ValueChangedEvent<string>) {
    this._source = {
      ...this._source!,
      stat_compensation: ev.detail.value || null,
    };
    this._updateFormDirtyState();
  }

  private _entityCompensationChanged(ev: ValueChangedEvent<string>) {
    this._source = {
      ...this._source!,
      entity_energy_price_export: ev.detail.value || null,
    };
    this._updateFormDirtyState();
  }

  private _numberCompensationChanged(ev: HASSDomCurrentTargetEvent<HaInput>) {
    const value = ev.currentTarget.value
      ? parseFloat(ev.currentTarget.value)
      : null;
    this._source = { ...this._source!, number_energy_price_export: value };
    this._updateFormDirtyState();
  }

  private _handlePowerConfigChanged(
    ev: HASSDomEvent<HASSDomEvents["power-config-changed"]>
  ) {
    this._powerType = ev.detail.powerType;
    this._powerConfig = ev.detail.powerConfig;
    this._updateFormDirtyState();
  }

  private _updateFormDirtyState(): void {
    this._updateDirtyState({
      source: this._source!,
      powerType: this._powerType,
      powerConfig: this._powerConfig,
      importCostType: this._importCostType,
      exportCostType: this._exportCostType,
    });
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

      const source: GridSourceTypeEnergyPreference = {
        type: "grid",
        stat_energy_from: draft.stat_energy_from,
        stat_energy_to: draft.stat_energy_to,
        stat_cost: draft.stat_cost,
        stat_compensation: draft.stat_compensation,
        entity_energy_price: draft.entity_energy_price,
        number_energy_price: draft.number_energy_price,
        entity_energy_price_export: draft.entity_energy_price_export,
        number_energy_price_export: draft.number_energy_price_export,
        cost_adjustment_day: draft.cost_adjustment_day,
      };
      if (draft.name) {
        source.name = draft.name;
      }
      // Compensation can be left over from an export that was pending until the
      // power sensors changed
      if (!source.stat_energy_to) {
        source.stat_compensation = null;
        source.entity_energy_price_export = null;
        source.number_energy_price_export = null;
      }

      if (powerType !== "none") {
        source.power_config = { ...powerConfig };
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
    draft: GridSourceTypeEnergyPreference,
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
            ? "ui.panel.config.energy.grid.dialog.imported_energy_name"
            : "ui.panel.config.energy.grid.dialog.exported_energy_name",
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
        "ui.panel.config.energy.grid.dialog.energy_sensors_needed"
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
    "ha-energy-grid-source-editor": HaEnergyGridSourceEditor;
  }
}
