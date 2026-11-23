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
  formattersContext,
  statesContext,
} from "../../../../data/context";
import type { HeatSourceTypeEnergyPreference } from "../../../../data/energy";
import {
  emptyHeatEnergyPreference,
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
import type {
  EnergyEditorStatus,
  EnergyHeatSourceEditorParams,
} from "./energy-editor";
import { EnergyEditorMixin, energyEditorStyles } from "./energy-editor";

type CostType = "no-costs" | "number" | "entity" | "statistic";

interface HeatFormState {
  source: HeatSourceTypeEnergyPreference;
  costs: CostType;
}

const heatDeviceClasses = ["energy"];
const heatUnitClasses = ["energy"];
const powerUnitClasses = ["power"];

@customElement("ha-energy-heat-source-editor")
export class HaEnergyHeatSourceEditor extends EnergyEditorMixin(
  DirtyStateProviderMixin<HeatFormState>()(LitElement)
) {
  @property({ attribute: false }) public params!: EnergyHeatSourceEditorParams;

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

  @state() private _source?: HeatSourceTypeEnergyPreference;

  @state() private _costs: CostType = "no-costs";

  @state() private _numberPriceText = "";

  @state() private _energy_units?: string[];

  @state() private _error?: string;

  @state() private _saving = false;

  private _excludeList?: string[];

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
      : emptyHeatEnergyPreference();
    this._costs = this._source.stat_cost
      ? "statistic"
      : this._source.entity_energy_price
        ? "entity"
        : typeof this._source.number_energy_price === "number"
          ? "number"
          : "no-costs";
    this._numberPriceText =
      typeof this._source.number_energy_price === "number"
        ? String(this._source.number_energy_price)
        : "";
    this._excludeList = params.heat_sources
      .map((entry) => entry.stat_energy_from)
      .filter((id) => id !== this._source?.stat_energy_from);
    this._initDirtyTracking(
      { type: "deep" },
      { source: this._source, costs: this._costs }
    );
    this._loadUnits();
  }

  private async _loadUnits() {
    try {
      const energy = await getSensorDeviceClassConvertibleUnits(
        this._api.callWS,
        "energy"
      );
      this._energy_units = energy.units;
    } catch (err: unknown) {
      this._error = err instanceof Error ? err.message : String(err);
    }
  }

  protected get editorStatus(): EnergyEditorStatus {
    return {
      dirty: this.isDirtyState,
      valid:
        !!this._source?.stat_energy_from &&
        (this._costs !== "number" ||
          (typeof this._source?.number_energy_price === "number" &&
            Number.isFinite(this._source.number_energy_price))) &&
        (this._costs !== "entity" || !!this._source?.entity_energy_price) &&
        (this._costs !== "statistic" || !!this._source?.stat_cost),
      saving: this._saving,
    };
  }

  protected render() {
    if (!this._source) {
      return nothing;
    }

    const pickableUnit = this._energy_units?.join(", ") || "";

    const labelStatistic = this._source.stat_energy_from;

    return html`
      ${
        this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing
      }
      <div class="group">
        <div class="group-header">
          <p>
            ${this._localize("ui.panel.config.energy.heat.dialog.paragraph")}
          </p>
        </div>
        <ha-statistic-picker
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          statistic-types="sum"
          .includeUnitClass=${heatUnitClasses}
          .includeDeviceClass=${heatDeviceClasses}
          .value=${this._source.stat_energy_from}
          .label=${this._localize(
            "ui.panel.config.energy.heat.dialog.heat_usage"
          )}
          .excludeStatistics=${this._excludeList}
          @value-changed=${this._statisticChanged}
          .disabled=${this._saving}
          .helper=${this._localize(
            "ui.panel.config.energy.heat.dialog.entity_para",
            { unit: pickableUnit }
          )}
        ></ha-statistic-picker>
        <ha-input
          .label=${this._localize(
            "ui.panel.config.energy.heat.dialog.display_name"
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
        statistic-types="mean"
        .includeUnitClass=${powerUnitClasses}
        .value=${this._source.stat_rate}
        .label=${this._localize(
          "ui.panel.config.energy.heat.dialog.heat_power"
        )}
        .helper=${this._localize(
          "ui.panel.config.energy.heat.dialog.power_para"
        )}
        @value-changed=${this._powerStatisticChanged}
        .disabled=${this._saving}
      ></ha-statistic-picker>

      <wa-divider></wa-divider>

      <div class="group">
        <ha-select
          .label=${this._localize(
            "ui.panel.config.energy.heat.dialog.cost_tracking"
          )}
          .helper=${this._localize(
            "ui.panel.config.energy.heat.dialog.cost_para"
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
        label: this._localize("ui.panel.config.energy.heat.dialog.no_cost"),
      },
      {
        value: "statistic",
        label: this._localize("ui.panel.config.energy.heat.dialog.cost_stat"),
      },
      {
        value: "entity",
        label: this._localize("ui.panel.config.energy.heat.dialog.cost_entity"),
        disabled: externalSource,
      },
      {
        value: "number",
        label: this._localize("ui.panel.config.energy.heat.dialog.cost_number"),
        disabled: externalSource,
      },
    ];
  }

  private _renderCost() {
    const unitPrice = `${this._hassConfig.currency}/kWh`;

    switch (this._costs) {
      case "statistic":
        return html`<ha-statistic-picker
          .disabled=${this._saving}
          statistic-types="sum"
          .value=${this._source!.stat_cost ?? undefined}
          .label=${`${this._localize(
            "ui.panel.config.energy.heat.dialog.cost_stat_input"
          )} (${this._hassConfig.currency})`}
          @value-changed=${this._priceStatChanged}
        ></ha-statistic-picker>`;
      case "entity":
        return html`<ha-entity-picker
          .disabled=${this._saving}
          .includeDomains=${["sensor", "input_number"]}
          .value=${this._source!.entity_energy_price ?? undefined}
          .label=${this._localize(
            "ui.panel.config.energy.heat.dialog.cost_entity_input"
          )}
          .helper=${this._localize(
            "ui.panel.config.energy.heat.dialog.cost_entity_helper",
            { currency: this._hassConfig.currency }
          )}
          @value-changed=${this._priceEntityChanged}
        ></ha-entity-picker>`;
      case "number":
        return html`<ha-input
          .disabled=${this._saving}
          .label=${`${this._localize(
            "ui.panel.config.energy.heat.dialog.cost_number_input"
          )} (${unitPrice})`}
          step="any"
          type="number"
          required
          auto-validate
          .value=${this._numberPriceText}
          @input=${this._numberPriceChanged}
        >
          <span slot="end">${unitPrice}</span>
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

  private _priceStatChanged(ev: ValueChangedEvent<string>) {
    this._numberPriceText = "";
    this._source = {
      ...this._source!,
      entity_energy_price: null,
      number_energy_price: null,
      stat_cost: ev.detail.value,
    };
    this._updateFormDirtyState();
  }

  private _priceEntityChanged(ev: ValueChangedEvent<string>) {
    this._numberPriceText = "";
    this._source = {
      ...this._source!,
      entity_energy_price: ev.detail.value,
      number_energy_price: null,
      stat_cost: null,
    };
    this._updateFormDirtyState();
  }

  private async _statisticChanged(ev: ValueChangedEvent<string>) {
    const statisticId = ev.detail.value;
    this._source = { ...this._source!, stat_energy_from: statisticId };
    this._error = undefined;
    if (
      statisticId &&
      isExternalStatistic(statisticId) &&
      this._costs !== "statistic"
    ) {
      this._costs = "no-costs";
    }
    this._updateFormDirtyState();
    if (!statisticId) return;
    const params = this.params;
    try {
      const [metadata] = await getStatisticMetadata(this._api.callWS, [
        statisticId,
      ]);
      if (
        this.params !== params ||
        this._source?.stat_energy_from !== statisticId
      ) {
        return;
      }
      if (
        metadata &&
        isExternalStatistic(statisticId) &&
        params.statsMetadata
      ) {
        params.statsMetadata[statisticId] = metadata;
      }
      this.requestUpdate();
    } catch (err: unknown) {
      if (
        this.params === params &&
        this._source?.stat_energy_from === statisticId
      ) {
        this._error = err instanceof Error ? err.message : String(err);
      }
    }
  }

  private _powerStatisticChanged(ev: ValueChangedEvent<string>) {
    this._source = {
      ...this._source!,
      stat_rate: ev.detail.value || undefined,
    };
    this._updateFormDirtyState();
  }

  private _nameChanged(ev: HASSDomCurrentTargetEvent<HaInput>) {
    this._source = {
      ...this._source!,
      name: ev.currentTarget.value,
    };
    if (!this._source.name) {
      delete this._source.name;
    }
    this._updateFormDirtyState();
  }

  private _updateFormDirtyState(): void {
    this._updateDirtyState({ source: this._source!, costs: this._costs });
  }

  public async save(): Promise<boolean> {
    // Keep the submitted source if the editor changes while saving.
    const params = this.params;
    if (!this.editorStatus.valid || this._saving) return false;
    const costs = this._costs;
    let source = this._source!;
    const isCurrent = () => this.params === params && this.isConnected;
    this._error = undefined;
    this._saving = true;
    try {
      source = {
        ...source,
        entity_energy_price:
          costs === "entity" ? source.entity_energy_price : null,
        number_energy_price:
          costs === "number" ? source.number_energy_price : null,
        stat_cost: costs === "statistic" ? source.stat_cost : null,
      };
      await params.saveCallback(source);
      if (isCurrent()) {
        this._markDirtyStateClean();
      }
      return true;
    } catch (err: unknown) {
      if (isCurrent()) {
        this._error = err instanceof Error ? err.message : String(err);
      }
      return false;
    } finally {
      if (isCurrent()) {
        this._saving = false;
      }
    }
  }

  static get styles(): CSSResultGroup {
    return energyEditorStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-heat-source-editor": HaEnergyHeatSourceEditor;
  }
}
