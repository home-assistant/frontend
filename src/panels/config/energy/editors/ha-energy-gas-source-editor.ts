import "@home-assistant/webawesome/dist/components/divider/divider";
import type { ContextType } from "@lit/context";
import type { CSSResultGroup, PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import type { HASSDomCurrentTargetEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-alert";
import "../../../../components/ha-markdown";
import "../../../../components/ha-select";
import type {
  HaSelectOption,
  HaSelectSelectEvent,
} from "../../../../components/ha-select";
import "../../../../components/input/ha-input";
import type { HaInput } from "../../../../components/input/ha-input";
import { entitiesContext, statesContext } from "../../../../data/context";
import type { GasSourceTypeEnergyPreference } from "../../../../data/energy";
import {
  computeEnergyLabel,
  emptyGasEnergyPreference,
  energyStatisticHelpUrl,
} from "../../../../data/energy";
import {
  getDisplayUnit,
  getStatisticLabel,
  getStatisticMetadata,
  isExternalStatistic,
} from "../../../../data/recorder";
import { getSensorDeviceClassConvertibleUnits } from "../../../../data/sensor";
import { DirtyStateProviderMixin } from "../../../../mixins/dirty-state-provider-mixin";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import type { IntegralUnits } from "../dialogs/energy-integral";
import {
  confirmIntegrals,
  findIntegral,
  integralTotalUnit,
  integralUnits,
} from "../dialogs/energy-integral";
import type {
  EnergyEditorStatus,
  EnergyGasSourceEditorParams,
} from "./energy-editor";
import { EnergyEditorMixin, energyEditorStyles } from "./energy-editor";

type CostType = "no-costs" | "number" | "entity" | "statistic";

interface GasFormState {
  source: GasSourceTypeEnergyPreference;
  costs: CostType;
}

const gasDeviceClasses = ["gas", "energy"];
const gasUnitClasses = ["volume", "energy"];
const flowRateUnitClasses = ["volume_flow_rate"];

@customElement("ha-energy-gas-source-editor")
export class HaEnergyGasSourceEditor extends EnergyEditorMixin(
  DirtyStateProviderMixin<GasFormState>()(LitElement)
) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public params!: EnergyGasSourceEditorParams;

  // Live, so a retry finds the helpers already created
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @consume({ context: entitiesContext, subscribe: true })
  private _entities!: ContextType<typeof entitiesContext>;

  @state() private _source?: GasSourceTypeEnergyPreference;

  @state() private _costs: CostType = "no-costs";

  @state() private _numberPriceText = "";

  @state() private _pickedDisplayUnit?: string | null;

  @state() private _energy_units?: string[];

  @state() private _gas_units?: string[];

  @state() private _flow_rate_units?: string[];

  @state() private _error?: string;

  @state() private _saving = false;

  private _excludeList?: string[];

  private _excludeListFlowRate?: string[];

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
      : emptyGasEnergyPreference();
    this._pickedDisplayUnit = getDisplayUnit(
      this.hass.states,
      params.source?.stat_energy_from,
      params.source?.stat_energy_from
        ? params.statsMetadata?.[params.source.stat_energy_from]
        : undefined
    );
    this._costs = this._source.entity_energy_price
      ? "entity"
      : typeof this._source.number_energy_price === "number"
        ? "number"
        : this._source.stat_cost
          ? "statistic"
          : "no-costs";
    this._numberPriceText =
      typeof this._source.number_energy_price === "number"
        ? String(this._source.number_energy_price)
        : "";
    this._excludeList = params.gas_sources
      .map((entry) => entry.stat_energy_from)
      .filter((id) => id !== this._source?.stat_energy_from);
    this._excludeListFlowRate = params.gas_sources
      .map((entry) => entry.stat_rate)
      .filter((id) => id && id !== this._source?.stat_rate) as string[];
    this._initDirtyTracking(
      { type: "deep" },
      { source: this._source, costs: this._costs }
    );
    this._loadUnits();
  }

  private async _loadUnits() {
    const [energy, gas, flowRate] = await Promise.all([
      getSensorDeviceClassConvertibleUnits(this.hass, "energy"),
      getSensorDeviceClassConvertibleUnits(this.hass, "gas"),
      getSensorDeviceClassConvertibleUnits(this.hass, "volume_flow_rate"),
    ]);
    this._energy_units = energy.units;
    this._gas_units = gas.units;
    this._flow_rate_units = flowRate.units;
  }

  protected get editorStatus(): EnergyEditorStatus {
    return {
      dirty: this.isDirtyState,
      valid:
        !!(this._source?.stat_energy_from || this._integralUnits()) &&
        (this._costs !== "number" ||
          typeof this._source?.number_energy_price === "number"),
      saving: this._saving,
    };
  }

  protected render() {
    if (!this._source) {
      return nothing;
    }

    const pickableUnit =
      this.params.allowedGasUnitClass === undefined
        ? [...(this._gas_units || []), ...(this._energy_units || [])].join(", ")
        : this.params.allowedGasUnitClass === "energy"
          ? this._energy_units?.join(", ") || ""
          : this._gas_units?.join(", ") || "";

    const labelStatistic =
      this._source.stat_energy_from || this._source.stat_rate;

    return html`
      ${
        this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing
      }
      <div class="group">
        <div class="group-header">
          <p>
            ${this.hass.localize("ui.panel.config.energy.gas.dialog.paragraph")}
          </p>
          <p>
            ${this.hass.localize("ui.panel.config.energy.gas.dialog.note_para")}
          </p>
        </div>
        <ha-statistic-picker
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          .includeUnitClass=${this.params.allowedGasUnitClass || gasUnitClasses}
          .includeDeviceClass=${gasDeviceClasses}
          .value=${this._source.stat_energy_from}
          .label=${this.hass.localize(
            "ui.panel.config.energy.gas.dialog.gas_usage"
          )}
          .excludeStatistics=${this._excludeList}
          @value-changed=${this._statisticChanged}
          .disabled=${this._saving}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.gas.dialog.entity_para",
            { unit: pickableUnit }
          )}
        ></ha-statistic-picker>
        <ha-input
          .label=${this.hass.localize(
            "ui.panel.config.energy.gas.dialog.display_name"
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

      <ha-statistic-picker
        .includeUnitClass=${flowRateUnitClasses}
        .value=${this._source.stat_rate}
        .label=${this.hass.localize(
          "ui.panel.config.energy.gas.dialog.gas_flow_rate"
        )}
        .excludeStatistics=${this._excludeListFlowRate}
        @value-changed=${this._flowRateStatisticChanged}
        .disabled=${this._saving}
        .invalid=${!!this._flowRateError()}
        .errorMessage=${this._flowRateError()}
        .helper=${this.hass.localize(
          "ui.panel.config.energy.gas.dialog.flow_rate_para",
          { unit: this._flow_rate_units?.join(", ") || "" }
        )}
      ></ha-statistic-picker>

      <wa-divider></wa-divider>

      <div class="group">
        <ha-select
          .label=${this.hass.localize(
            "ui.panel.config.energy.gas.dialog.cost_tracking"
          )}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.gas.dialog.cost_para"
          )}
          .value=${this._costs}
          .options=${this._costOptions()}
          .disabled=${this._saving}
          @selected=${this._handleCostChanged}
        ></ha-select>
        ${this._renderCost()}
      </div>
    `;
  }

  private _costOptions(): HaSelectOption[] {
    // External statistics (from integrations) cannot use entity/number cost tracking
    const externalSource =
      !!this._source?.stat_energy_from &&
      isExternalStatistic(this._source.stat_energy_from);
    return [
      {
        value: "no-costs",
        label: this.hass.localize("ui.panel.config.energy.gas.dialog.no_cost"),
      },
      {
        value: "statistic",
        label: this.hass.localize(
          "ui.panel.config.energy.gas.dialog.cost_stat"
        ),
      },
      {
        value: "entity",
        label: this.hass.localize(
          "ui.panel.config.energy.gas.dialog.cost_entity"
        ),
        disabled: externalSource,
      },
      {
        value: "number",
        label: this.hass.localize(
          "ui.panel.config.energy.gas.dialog.cost_number"
        ),
        disabled: externalSource,
      },
    ];
  }

  private _renderCost() {
    const displayUnit = this._source!.stat_energy_from
      ? this._pickedDisplayUnit
      : this._integralTotalUnit();
    const unitPrice = displayUnit
      ? `${this.hass.config.currency}/${displayUnit}`
      : undefined;
    const pickedUnitClass =
      displayUnit && this._energy_units?.includes(displayUnit)
        ? "energy"
        : displayUnit && this._gas_units?.includes(displayUnit)
          ? "volume"
          : undefined;

    switch (this._costs) {
      case "statistic":
        return html`<ha-statistic-picker
          .disabled=${this._saving}
          statistic-types="sum"
          .value=${this._source!.stat_cost}
          .label=${`${this.hass.localize(
            "ui.panel.config.energy.gas.dialog.cost_stat_input"
          )} (${this.hass.config.currency})`}
          @value-changed=${this._priceStatChanged}
        ></ha-statistic-picker>`;
      case "entity":
        return html`<ha-entity-picker
          .disabled=${this._saving}
          include-domains='["sensor", "input_number"]'
          .value=${this._source!.entity_energy_price}
          .label=${this.hass.localize(
            "ui.panel.config.energy.gas.dialog.cost_entity_input"
          )}
          .helper=${
            pickedUnitClass
              ? html`<ha-markdown
                  .content=${this.hass.localize(
                    "ui.panel.config.energy.gas.dialog.cost_entity_helper",
                    pickedUnitClass === "energy"
                      ? {
                          currency: this.hass.config.currency,
                          class: this.hass.localize(
                            "ui.panel.config.energy.gas.dialog.cost_entity_helper_energy"
                          ),
                          unit1: "kWh",
                          unit2: "Wh",
                        }
                      : {
                          currency: this.hass.config.currency,
                          class: this.hass.localize(
                            "ui.panel.config.energy.gas.dialog.cost_entity_helper_volume"
                          ),
                          unit1: "m³",
                          unit2: "ft³",
                        }
                  )}
                ></ha-markdown>`
              : nothing
          }
          @value-changed=${this._priceEntityChanged}
        ></ha-entity-picker>`;
      case "number":
        return html`<ha-input
          .disabled=${this._saving}
          .label=${`${this.hass.localize(
            "ui.panel.config.energy.gas.dialog.cost_number_input"
          )} ${unitPrice ? ` (${unitPrice})` : ""}`}
          step="any"
          type="number"
          required
          auto-validate
          .value=${this._numberPriceText}
          @input=${this._numberPriceChanged}
        >
          ${unitPrice ? html`<span slot="end">${unitPrice}</span>` : nothing}
        </ha-input>`;
      default:
        return nothing;
    }
  }

  private _handleCostChanged(ev: HaSelectSelectEvent) {
    this._costs = ev.detail.value as CostType;
    this._updateFormDirtyState();
  }

  private _numberPriceChanged(ev: HASSDomCurrentTargetEvent<HaInput>) {
    // Render the typed text so partial input such as "0." is not rewritten
    this._numberPriceText = ev.currentTarget.value ?? "";
    this._source = {
      ...this._source!,
      number_energy_price: this._numberPriceText
        ? parseFloat(this._numberPriceText)
        : null,
      entity_energy_price: null,
      stat_cost: null,
    };
    this._updateFormDirtyState();
  }

  private _priceStatChanged(ev: CustomEvent) {
    this._numberPriceText = "";
    this._source = {
      ...this._source!,
      entity_energy_price: null,
      number_energy_price: null,
      stat_cost: ev.detail.value,
    };
    this._updateFormDirtyState();
  }

  private _priceEntityChanged(ev: CustomEvent) {
    this._numberPriceText = "";
    this._source = {
      ...this._source!,
      entity_energy_price: ev.detail.value,
      number_energy_price: null,
      stat_cost: null,
    };
    this._updateFormDirtyState();
  }

  private _flowRateStatisticChanged(ev: ValueChangedEvent<string>) {
    this._source = {
      ...this._source!,
      stat_rate: ev.detail.value || undefined,
    };
    this._updateFormDirtyState();
  }

  private async _statisticChanged(ev: ValueChangedEvent<string>) {
    if (ev.detail.value) {
      const [metadata] = await getStatisticMetadata(this.hass.callWS, [
        ev.detail.value,
      ]);
      if (
        metadata &&
        isExternalStatistic(ev.detail.value) &&
        this.params.statsMetadata &&
        !(ev.detail.value in this.params.statsMetadata)
      ) {
        this.params.statsMetadata[ev.detail.value] = metadata;
      }
      this._pickedDisplayUnit = getDisplayUnit(
        this.hass.states,
        ev.detail.value,
        metadata
      );
      if (isExternalStatistic(ev.detail.value) && this._costs !== "statistic") {
        this._costs = "no-costs";
      }
    } else {
      this._pickedDisplayUnit = undefined;
    }
    this._source = {
      ...this._source!,
      stat_energy_from: ev.detail.value,
    };
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

  private _updateFormDirtyState(): void {
    this._updateDirtyState({ source: this._source!, costs: this._costs });
  }

  private _integralUnits(): IntegralUnits | undefined {
    const statRate = this._source?.stat_rate;
    // Gas sources can't mix volume and energy units
    if (
      !statRate ||
      !this._gas_units ||
      this.params.allowedGasUnitClass === "energy"
    ) {
      return undefined;
    }
    return integralUnits(
      this.hass.states[statRate]?.attributes.unit_of_measurement,
      this._gas_units
    );
  }

  private _flowRateError(): string | undefined {
    if (
      this._source?.stat_energy_from ||
      !this._source?.stat_rate ||
      !this._gas_units ||
      this._integralUnits()
    ) {
      return undefined;
    }
    return this.hass.localize(
      this.params.allowedGasUnitClass === "energy"
        ? "ui.panel.config.energy.gas.dialog.flow_rate_energy_sources"
        : "ui.panel.config.energy.gas.dialog.flow_rate_no_volume"
    );
  }

  private _integralTotalUnit(): string | undefined {
    const units = this._integralUnits();
    if (!units) {
      return undefined;
    }
    const statRate = this._source!.stat_rate!;
    // A reused helper can display another unit than a new one would
    const existing = findIntegral(
      this.hass.states,
      this.hass.entities,
      statRate,
      "gas",
      this._excludeList
    );
    return existing
      ? getDisplayUnit(this.hass.states, existing, undefined) || undefined
      : integralTotalUnit(
          this.hass.states[statRate].attributes.unit_of_measurement!,
          units
        );
  }

  public async save(): Promise<boolean> {
    // The editor can be replaced while saving, but a created helper must still
    // be saved with the submitted source
    const params = this.params;
    const costs = this._costs;
    let source = this._source!;
    const isCurrent = () => this.params === params && this.isConnected;
    this._error = undefined;
    this._saving = true;
    try {
      if (!source.stat_energy_from) {
        const statEnergyFrom = await this._gasFromFlowRate(source);
        if (!statEnergyFrom) {
          return false;
        }
        source = { ...source, stat_energy_from: statEnergyFrom };
        if (isCurrent()) {
          this._pickedDisplayUnit = this._integralTotalUnit();
          // Keep edits made meanwhile, only fill in the new sensor
          this._source = { ...this._source!, stat_energy_from: statEnergyFrom };
          this._updateFormDirtyState();
        }
      }
      if (costs === "no-costs") {
        source = {
          ...source,
          entity_energy_price: null,
          number_energy_price: null,
          stat_cost: null,
        };
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

  private async _gasFromFlowRate(
    draft: GasSourceTypeEnergyPreference
  ): Promise<string | undefined> {
    const statRate = draft.stat_rate!;
    const units = this._integralUnits();
    if (!units) {
      return undefined;
    }
    const sensors = await confirmIntegrals(this, this.hass, {
      deviceClass: "gas",
      states: this._states,
      entities: this._entities,
      requests: [
        {
          rate: statRate,
          units,
          name: this.hass.localize(
            "ui.panel.config.energy.integral.gas.sensor_name",
            {
              name: computeEnergyLabel(
                this.hass.states,
                this.hass.formatEntityName,
                statRate,
                this.params.statsMetadata?.[statRate],
                draft.name
              ),
            }
          ),
        },
      ],
      intro: this.hass.localize(
        "ui.panel.config.energy.gas.dialog.gas_sensor_needed"
      ),
      exclude: this._excludeList,
      statsMetadata: this.params.statsMetadata,
    });
    return sensors?.[0];
  }

  static get styles(): CSSResultGroup {
    return energyEditorStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-gas-source-editor": HaEnergyGasSourceEditor;
  }
}
