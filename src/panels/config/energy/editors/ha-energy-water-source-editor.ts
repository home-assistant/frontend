import "@home-assistant/webawesome/dist/components/divider/divider";
import type { ContextType } from "@lit/context";
import type { CSSResultGroup, PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HassConfig } from "home-assistant-js-websocket";
import { consume } from "../../../../common/decorators/consume";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import { transform } from "../../../../common/decorators/transform";
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
import {
  apiContext,
  configContext,
  entitiesContext,
  formattersContext,
  statesContext,
} from "../../../../data/context";
import type { WaterSourceTypeEnergyPreference } from "../../../../data/energy";
import {
  computeEnergyLabel,
  emptyWaterEnergyPreference,
  energyStatisticHelpUrl,
} from "../../../../data/energy";
import {
  getStatisticLabel,
  getStatisticMetadata,
  isExternalStatistic,
} from "../../../../data/recorder";
import { getSensorDeviceClassConvertibleUnits } from "../../../../data/sensor";
import { DirtyStateProviderMixin } from "../../../../mixins/dirty-state-provider-mixin";
import type {
  HomeAssistantApi,
  HomeAssistantConfig,
  HomeAssistantFormatters,
  ValueChangedEvent,
} from "../../../../types";
import type { IntegralUnits } from "../dialogs/energy-integral";
import { confirmIntegrals, integralUnits } from "../dialogs/energy-integral";
import type {
  EnergyEditorStatus,
  EnergyWaterSourceEditorParams,
} from "./energy-editor";
import { EnergyEditorMixin, energyEditorStyles } from "./energy-editor";

type CostType = "no-costs" | "number" | "entity" | "statistic";

interface WaterFormState {
  source: WaterSourceTypeEnergyPreference;
  costs: CostType;
}

const flowRateUnitClasses = ["volume_flow_rate"];

@customElement("ha-energy-water-source-editor")
export class HaEnergyWaterSourceEditor extends EnergyEditorMixin(
  DirtyStateProviderMixin<WaterFormState>()(LitElement)
) {
  @property({ attribute: false })
  public params!: EnergyWaterSourceEditorParams;

  @state() @consumeLocalize() private _localize!: LocalizeFunc;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  @transform<
    HomeAssistantFormatters,
    HomeAssistantFormatters["formatEntityName"]
  >({
    transformer: ({ formatEntityName }) => formatEntityName,
  })
  private _formatEntityName!: HomeAssistantFormatters["formatEntityName"];

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _hassConfig!: HassConfig;

  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  // Kept current without rendering on every state change
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @consume({ context: entitiesContext, subscribe: true })
  private _entities!: ContextType<typeof entitiesContext>;

  @state()
  @consume({ context: statesContext, subscribe: true })
  @transform<ContextType<typeof statesContext>, string>({
    transformer: function (this: HaEnergyWaterSourceEditor, states) {
      const statRate = this._source?.stat_rate;
      return statRate
        ? states?.[statRate]?.attributes.unit_of_measurement
        : undefined;
    },
    watch: ["_source"],
  })
  private _rateUnit?: string;

  @state() private _source?: WaterSourceTypeEnergyPreference;

  @state() private _costs: CostType = "no-costs";

  @state() private _numberPriceText = "";

  @state() private _water_units?: string[];

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
      : emptyWaterEnergyPreference();
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
    this._excludeList = params.water_sources
      .map((entry) => entry.stat_energy_from)
      .filter((id) => id !== this._source?.stat_energy_from);
    this._excludeListFlowRate = params.water_sources
      .map((entry) => entry.stat_rate)
      .filter((id) => id && id !== this._source?.stat_rate) as string[];
    this._initDirtyTracking(
      { type: "deep" },
      { source: this._source, costs: this._costs }
    );
    this._loadUnits();
  }

  private async _loadUnits() {
    const [water, flowRate] = await Promise.all([
      getSensorDeviceClassConvertibleUnits(this._api.callWS, "water"),
      getSensorDeviceClassConvertibleUnits(
        this._api.callWS,
        "volume_flow_rate"
      ),
    ]);
    this._water_units = water.units;
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

    const labelStatistic =
      this._source.stat_energy_from || this._source.stat_rate;

    return html`
      ${
        this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing
      }
      <div class="group">
        <ha-statistic-picker
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          include-unit-class="volume"
          include-device-class="water"
          .value=${this._source.stat_energy_from}
          .label=${this._localize(
            "ui.panel.config.energy.water.dialog.water_usage"
          )}
          .excludeStatistics=${this._excludeList}
          @value-changed=${this._statisticChanged}
          .disabled=${this._saving}
          .helper=${this._localize(
            "ui.panel.config.energy.water.dialog.entity_para",
            { unit: this._water_units?.join(", ") || "" }
          )}
        ></ha-statistic-picker>
        <ha-input
          .label=${this._localize(
            "ui.panel.config.energy.water.dialog.display_name"
          )}
          type="text"
          .disabled=${!labelStatistic || this._saving}
          .value=${this._source.name || ""}
          .placeholder=${
            labelStatistic
              ? getStatisticLabel(
                  this._states,
                  this._formatEntityName,
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
        .label=${this._localize(
          "ui.panel.config.energy.water.dialog.water_flow_rate"
        )}
        .excludeStatistics=${this._excludeListFlowRate}
        @value-changed=${this._flowRateStatisticChanged}
        .disabled=${this._saving}
        .invalid=${!!this._flowRateError()}
        .errorMessage=${this._flowRateError()}
        .helper=${this._localize(
          "ui.panel.config.energy.water.dialog.flow_rate_para",
          { unit: this._flow_rate_units?.join(", ") || "" }
        )}
      ></ha-statistic-picker>

      <wa-divider></wa-divider>

      <div class="group">
        <ha-select
          .label=${this._localize(
            "ui.panel.config.energy.water.dialog.cost_tracking"
          )}
          .helper=${this._localize(
            "ui.panel.config.energy.water.dialog.cost_para"
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
        label: this._localize("ui.panel.config.energy.water.dialog.no_cost"),
      },
      {
        value: "statistic",
        label: this._localize("ui.panel.config.energy.water.dialog.cost_stat"),
      },
      {
        value: "entity",
        label: this._localize(
          "ui.panel.config.energy.water.dialog.cost_entity"
        ),
        disabled: externalSource,
      },
      {
        value: "number",
        label: this._localize(
          "ui.panel.config.energy.water.dialog.cost_number"
        ),
        disabled: externalSource,
      },
    ];
  }

  private _renderCost() {
    const unitPriceFixed = `${this._hassConfig.currency}/${
      this._hassConfig.unit_system.volume === "gal" ? "gal" : "m³"
    }`;

    switch (this._costs) {
      case "statistic":
        return html`<ha-statistic-picker
          .disabled=${this._saving}
          statistic-types="sum"
          .value=${this._source!.stat_cost}
          .label=${`${this._localize(
            "ui.panel.config.energy.water.dialog.cost_stat_input"
          )} (${this._hassConfig.currency})`}
          @value-changed=${this._priceStatChanged}
        ></ha-statistic-picker>`;
      case "entity":
        return html`<ha-entity-picker
          .disabled=${this._saving}
          include-domains='["sensor", "input_number"]'
          .value=${this._source!.entity_energy_price}
          .label=${this._localize(
            "ui.panel.config.energy.water.dialog.cost_entity_input"
          )}
          .helper=${html`<ha-markdown
            .content=${this._localize(
              "ui.panel.config.energy.water.dialog.cost_entity_helper",
              { currency: this._hassConfig.currency }
            )}
          ></ha-markdown>`}
          @value-changed=${this._priceEntityChanged}
        ></ha-entity-picker>`;
      case "number":
        return html`<ha-input
          .disabled=${this._saving}
          .label=${`${this._localize(
            "ui.panel.config.energy.water.dialog.cost_number_input"
          )} (${unitPriceFixed})`}
          step="any"
          type="number"
          required
          auto-validate
          .value=${this._numberPriceText}
          @input=${this._numberPriceChanged}
        >
          <span slot="end">${unitPriceFixed}</span>
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
    if (
      ev.detail.value &&
      isExternalStatistic(ev.detail.value) &&
      this._costs !== "statistic"
    ) {
      this._costs = "no-costs";
    }
    this._source = {
      ...this._source!,
      stat_energy_from: ev.detail.value,
    };

    if (
      ev.detail.value &&
      isExternalStatistic(ev.detail.value) &&
      this.params.statsMetadata &&
      !(ev.detail.value in this.params.statsMetadata)
    ) {
      const [metadata] = await getStatisticMetadata(this._api.callWS, [
        ev.detail.value,
      ]);
      if (metadata) {
        this.params.statsMetadata[ev.detail.value] = metadata;
        this.requestUpdate();
      }
    }
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

  private _flowRateError(): string | undefined {
    if (
      this._source?.stat_energy_from ||
      !this._source?.stat_rate ||
      !this._water_units ||
      this._integralUnits()
    ) {
      return undefined;
    }
    return this._localize(
      "ui.panel.config.energy.water.dialog.flow_rate_no_volume"
    );
  }

  private _integralUnits(): IntegralUnits | undefined {
    const statRate = this._source?.stat_rate;
    if (!statRate || !this._water_units) {
      return undefined;
    }
    return integralUnits(this._rateUnit, this._water_units);
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
        const statEnergyFrom = await this._waterFromFlowRate(source);
        if (!statEnergyFrom) {
          return false;
        }
        source = { ...source, stat_energy_from: statEnergyFrom };
        if (isCurrent()) {
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

  private async _waterFromFlowRate(
    draft: WaterSourceTypeEnergyPreference
  ): Promise<string | undefined> {
    const statRate = draft.stat_rate!;
    const units = this._integralUnits();
    if (!units) {
      return undefined;
    }
    const sensors = await confirmIntegrals(this, {
      api: this._api,
      localize: this._localize,
      formatEntityName: this._formatEntityName,
      deviceClass: "water",
      states: this._states,
      entities: this._entities,
      requests: [
        {
          rate: statRate,
          units,
          name: this._localize(
            "ui.panel.config.energy.integral.water.sensor_name",
            {
              name: computeEnergyLabel(
                this._states,
                this._formatEntityName,
                statRate,
                this.params.statsMetadata?.[statRate],
                draft.name
              ),
            }
          ),
        },
      ],
      intro: this._localize(
        "ui.panel.config.energy.water.dialog.water_sensor_needed"
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
    "ha-energy-water-source-editor": HaEnergyWaterSourceEditor;
  }
}
