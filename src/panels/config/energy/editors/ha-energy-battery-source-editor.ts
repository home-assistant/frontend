import "@home-assistant/webawesome/dist/components/divider/divider";
import type { ContextType } from "@lit/context";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import { deepEqual } from "../../../../common/util/deep-equal";
import { transform } from "../../../../common/decorators/transform";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import { fireEvent } from "../../../../common/dom/fire_event";
import type {
  LocalizeFunc,
  LocalizeKeys,
} from "../../../../common/translations/localize";
import type {
  HASSDomCurrentTargetEvent,
  HASSDomEvent,
} from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-statistic-picker";
import type { HaStatisticPicker } from "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-alert";
import "../../../../components/ha-select";
import type { HaSelectSelectEvent } from "../../../../components/ha-select";
import "../../../../components/input/ha-input";
import type { HaInput } from "../../../../components/input/ha-input";
import type {
  BatteryDirectionsPowerConfig,
  BatteryDirectionsSourceTypeEnergyPreference,
  BatterySourceTypeEnergyPreference,
  BatteryTotalsSourceTypeEnergyPreference,
  PowerConfig,
} from "../../../../data/energy";
import {
  computeEnergyLabel,
  energyStatisticHelpUrl,
  getBatteryPrimaryStat,
  isBatteryDirections,
} from "../../../../data/energy";
import {
  getStatisticLabel,
  getStatisticMetadata,
  isExternalStatistic,
} from "../../../../data/recorder";
import { getSensorDeviceClassConvertibleUnits } from "../../../../data/sensor";
import {
  apiContext,
  entitiesContext,
  formattersContext,
  statesContext,
} from "../../../../data/context";
import { DirtyStateProviderMixin } from "../../../../mixins/dirty-state-provider-mixin";
import { buttonLinkStyle } from "../../../../resources/styles";
import type {
  HomeAssistantApi,
  HomeAssistantFormatters,
  ValueChangedEvent,
} from "../../../../types";
import type { PowerIntegral } from "../dialogs/energy-integral";
import {
  confirmIntegrals,
  pendingIntegrals,
  pendingPowerIntegrals,
} from "../dialogs/energy-integral";
import "../dialogs/ha-energy-power-config";
import {
  BATTERY_DIRECTIONS,
  buildBatteryExcludeList,
  getBatteryMode,
  getInitialPowerConfig,
  getPowerHelperEntityId,
  getPowerTypeFromConfig,
  isPowerConfigValid,
  type BatteryDirection,
  type BatteryMode,
  type PowerType,
} from "../dialogs/power-config";
import type {
  EnergyBatterySourceEditorParams,
  EnergyEditorStatus,
} from "./energy-editor";
import { EnergyEditorMixin, energyEditorStyles } from "./energy-editor";

type DirectionEnergyKey = BatteryDirection["energy"];

type BatteryEnergyKey =
  "stat_energy_from" | "stat_energy_to" | DirectionEnergyKey;

/** The values of both modes, so switching between them keeps what was picked */
type BatteryDraft = Partial<Record<BatteryEnergyKey, string>> &
  Pick<
    BatteryTotalsSourceTypeEnergyPreference,
    "name" | "stat_soc" | "capacity"
  >;

interface BatteryPower {
  powerType: PowerType;
  powerConfig: PowerConfig;
  directionPower: BatteryDirectionsPowerConfig;
}

interface BatteryFormState {
  mode?: BatteryMode;
  powerType?: PowerType;
  source?: BatterySourceTypeEnergyPreference;
}

const energyUnitClasses = ["energy"];
const powerUnitClasses = ["power"];
const socStatisticsUnits = ["%"];
const socDeviceClass = "battery";

const ENERGY_NAME_KEYS: Record<BatteryEnergyKey, LocalizeKeys> = {
  stat_energy_from:
    "ui.panel.config.energy.battery.dialog.discharged_energy_name",
  stat_energy_to: "ui.panel.config.energy.battery.dialog.charged_energy_name",
  stat_energy_from_grid:
    "ui.panel.config.energy.battery.dialog.directions.from_grid.energy_name",
  stat_energy_from_solar:
    "ui.panel.config.energy.battery.dialog.directions.from_solar.energy_name",
  stat_energy_to_home:
    "ui.panel.config.energy.battery.dialog.directions.to_home.energy_name",
  stat_energy_to_grid:
    "ui.panel.config.energy.battery.dialog.directions.to_grid.energy_name",
};

const MISSING_SOURCE: Partial<
  Record<
    BatteryDirection["key"],
    {
      param: "has_grid_import" | "has_grid_export" | "has_solar";
      warning: LocalizeKeys;
    }
  >
> = {
  from_grid: {
    param: "has_grid_import",
    warning:
      "ui.panel.config.energy.battery.dialog.directions.from_grid.missing_source",
  },
  from_solar: {
    param: "has_solar",
    warning:
      "ui.panel.config.energy.battery.dialog.directions.from_solar.missing_source",
  },
  to_grid: {
    param: "has_grid_export",
    warning:
      "ui.panel.config.energy.battery.dialog.directions.to_grid.missing_source",
  },
};

const toDraft = (source?: BatterySourceTypeEnergyPreference): BatteryDraft => {
  if (!source) {
    return {};
  }
  const draft: BatteryDraft = {
    name: source.name,
    stat_soc: source.stat_soc,
    capacity: source.capacity,
  };
  if (isBatteryDirections(source)) {
    BATTERY_DIRECTIONS.forEach(({ energy }) => {
      draft[energy] = source[energy];
    });
  } else {
    draft.stat_energy_from = source.stat_energy_from;
    draft.stat_energy_to = source.stat_energy_to;
  }
  return draft;
};

const activeEnergyKeys = (mode: BatteryMode): BatteryEnergyKey[] =>
  mode === "total"
    ? ["stat_energy_from", "stat_energy_to"]
    : BATTERY_DIRECTIONS.map(({ energy }) => energy);

// Only the active mode's fields are saved. The backend writes stat_rate itself.
const toSource = (
  draft: BatteryDraft,
  mode: BatteryMode,
  power: BatteryPower
): BatterySourceTypeEnergyPreference => {
  let source: BatterySourceTypeEnergyPreference;
  if (mode === "total") {
    source = {
      type: "battery",
      stat_energy_from: draft.stat_energy_from ?? "",
      stat_energy_to: draft.stat_energy_to ?? "",
    };
    if (power.powerType !== "none") {
      source.power_config = { ...power.powerConfig };
    }
  } else {
    const directions: BatteryDirectionsSourceTypeEnergyPreference = {
      type: "battery",
    };
    const powerConfig: BatteryDirectionsPowerConfig = {};
    BATTERY_DIRECTIONS.forEach(({ energy, power: powerKey }) => {
      if (draft[energy]) {
        directions[energy] = draft[energy];
      }
      if (power.directionPower[powerKey]) {
        powerConfig[powerKey] = power.directionPower[powerKey];
      }
    });
    if (Object.keys(powerConfig).length) {
      directions.power_config = powerConfig;
    }
    source = directions;
  }
  if (draft.name) {
    source.name = draft.name;
  }
  if (draft.stat_soc) {
    source.stat_soc = draft.stat_soc;
  }
  if (draft.capacity != null) {
    source.capacity = draft.capacity;
  }
  return source;
};

@customElement("ha-energy-battery-source-editor")
export class HaEnergyBatterySourceEditor extends EnergyEditorMixin(
  DirtyStateProviderMixin<BatteryFormState>()(LitElement)
) {
  @property({ attribute: false })
  public params!: EnergyBatterySourceEditorParams;

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

  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  // Kept current without rendering on every state change
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @consume({ context: entitiesContext, subscribe: true })
  private _entities!: ContextType<typeof entitiesContext>;

  // Keeps the previous array while the result is unchanged, so other state
  // changes don't render
  @state()
  @consume({ context: statesContext, subscribe: true })
  @transform<
    ContextType<typeof statesContext>,
    PowerIntegral<BatteryEnergyKey>[]
  >({
    transformer: function (this: HaEnergyBatterySourceEditor, states) {
      let pending: PowerIntegral<BatteryEnergyKey>[] = [];
      if (states && this._source && this._energy_units) {
        if (this._mode === "total") {
          pending = pendingPowerIntegrals(
            states,
            this._source,
            this._powerType,
            this._powerConfig,
            this._energy_units
          );
        } else if (this._mode === "directions") {
          pending = pendingIntegrals(
            states,
            this._source,
            BATTERY_DIRECTIONS.map(
              ({ energy, power }) =>
                [energy, this._directionPower[power]] as const
            ),
            this._energy_units
          );
        }
      }
      return deepEqual(pending, this._pending) ? this._pending : pending;
    },
    watch: [
      "_mode",
      "_source",
      "_powerType",
      "_powerConfig",
      "_directionPower",
      "_energy_units",
    ],
  })
  private _pending?: PowerIntegral<BatteryEnergyKey>[];

  @state() private _mode?: BatteryMode;

  @state() private _source?: BatteryDraft;

  @state() private _powerType: PowerType = "none";

  @state() private _powerConfig: PowerConfig = {};

  @state() private _directionPower: BatteryDirectionsPowerConfig = {};

  @state() private _energy_units?: string[];

  @state() private _power_units?: string[];

  @state() private _error?: string;

  @state() private _saving = false;

  private _excludeList: string[] = [];

  private _generatedStatRate?: string;

  protected willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);
    if (changedProps.has("params")) {
      this._init();
    }
  }

  private _init() {
    const params = this.params;
    const saved = params.source;
    this._error = undefined;
    this._saving = false;
    this._mode = getBatteryMode(saved);
    this._source = toDraft(saved);

    const totals = saved && !isBatteryDirections(saved) ? saved : undefined;
    this._powerType = getPowerTypeFromConfig(
      totals?.power_config,
      totals?.stat_rate
    );
    this._powerConfig = getInitialPowerConfig(
      totals?.power_config,
      totals?.stat_rate
    );
    this._directionPower =
      saved && isBatteryDirections(saved) ? { ...saved.power_config } : {};

    this._excludeList = buildBatteryExcludeList(params.battery_sources, saved);
    this._generatedStatRate = saved?.power_config
      ? getPowerHelperEntityId(saved, saved.power_config)
      : undefined;

    this._initDirtyTracking({ type: "deep" }, this._formState());
    this._loadUnits();
  }

  private async _loadUnits() {
    const [energy, power] = await Promise.all([
      getSensorDeviceClassConvertibleUnits(this._api.callWS, "energy"),
      getSensorDeviceClassConvertibleUnits(this._api.callWS, "power"),
    ]);
    this._energy_units = energy.units;
    this._power_units = power.units;
  }

  private get _power(): BatteryPower {
    return {
      powerType: this._powerType,
      powerConfig: this._powerConfig,
      directionPower: this._directionPower,
    };
  }

  // What would be saved, so values left in the other mode don't count
  private _formState(): BatteryFormState {
    return {
      mode: this._mode,
      powerType: this._mode === "total" ? this._powerType : undefined,
      source: this._mode
        ? toSource(this._source ?? {}, this._mode, this._power)
        : undefined,
    };
  }

  protected get editorStatus(): EnergyEditorStatus {
    return {
      dirty: this.isDirtyState,
      valid: this._isValid(this._pending ?? []),
      saving: this._saving,
    };
  }

  protected render() {
    if (!this._source) {
      return nothing;
    }

    const pending = this._pending ?? [];
    const key = "ui.panel.config.energy.battery.dialog";

    return html`
      ${
        this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing
      }
      <div class="group">
        <p class="intro">${this._localize(`${key}.measurement_intro`)}</p>
        <ha-select
          .label=${this._localize(`${key}.measurement`)}
          .helper=${
            this._mode === "directions"
              ? this._localize(`${key}.measurement_directions_helper`)
              : undefined
          }
          .value=${this._mode}
          .options=${[
            {
              value: "total",
              label: this._localize(`${key}.measurement_total`),
              secondary: this._localize(`${key}.measurement_total_description`),
            },
            {
              value: "directions",
              label: this._localize(`${key}.measurement_directions`),
              secondary: this._localize(
                `${key}.measurement_directions_description`
              ),
            },
          ]}
          required
          .disabled=${this._saving}
          @selected=${this._modeChanged}
        ></ha-select>
      </div>
      ${
        this._mode === "total"
          ? this._renderTotal(pending)
          : this._mode === "directions"
            ? this._renderDirections(pending)
            : nothing
      }
    `;
  }

  private _renderTotal(pending: PowerIntegral<BatteryEnergyKey>[]) {
    const source = this._source!;
    const labelStatistic =
      source.stat_energy_from || source.stat_energy_to || pending[0]?.rate;

    return html`
      <wa-divider></wa-divider>

      <div class="group">
        <ha-statistic-picker
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          .includeUnitClass=${energyUnitClasses}
          .value=${source.stat_energy_from}
          .label=${this._localize(
            "ui.panel.config.energy.battery.dialog.energy_out_of_battery"
          )}
          .excludeStatistics=${this._exclude(source.stat_energy_to)}
          @value-changed=${this._statisticFromChanged}
          .disabled=${this._saving}
          .helper=${this._localize(
            "ui.panel.config.energy.battery.dialog.energy_helper_out",
            { unit: this._energy_units?.join(", ") || "" }
          )}
        ></ha-statistic-picker>
        <ha-statistic-picker
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          .includeUnitClass=${energyUnitClasses}
          .value=${source.stat_energy_to}
          .label=${this._localize(
            "ui.panel.config.energy.battery.dialog.energy_into_battery"
          )}
          .excludeStatistics=${this._exclude(source.stat_energy_from)}
          @value-changed=${this._statisticToChanged}
          .disabled=${this._saving}
          .helper=${this._localize(
            "ui.panel.config.energy.battery.dialog.energy_helper_into",
            { unit: this._energy_units?.join(", ") || "" }
          )}
        ></ha-statistic-picker>
        ${this._renderName(
          labelStatistic,
          labelStatistic &&
            getStatisticLabel(
              this._states,
              this._formatEntityName,
              labelStatistic,
              this.params.statsMetadata?.[labelStatistic]
            )
        )}
      </div>

      <wa-divider></wa-divider>

      <ha-energy-power-config
        .powerType=${this._powerType}
        .powerConfig=${this._powerConfig}
        .excludeList=${this._excludeList}
        .helperEntityId=${getPowerHelperEntityId(
          this.params.source,
          this._powerConfig
        )}
        .localizeBaseKey=${"ui.panel.config.energy.battery.dialog"}
        .disabled=${this._saving}
        @power-config-changed=${this._handlePowerConfigChanged}
      ></ha-energy-power-config>

      <wa-divider></wa-divider>

      <div class="group">${this._renderStateOfCharge()}</div>
    `;
  }

  private _renderDirections(pending: PowerIntegral<BatteryEnergyKey>[]) {
    const source = this._source!;
    const labelStatistic =
      getBatteryPrimaryStat(toSource(source, "directions", this._power)) ||
      pending[0]?.rate ||
      BATTERY_DIRECTIONS.map(({ power }) => this._directionPower[power]).find(
        Boolean
      );

    return html`
      ${BATTERY_DIRECTIONS.map(
        (direction) => html`
          <wa-divider></wa-divider>
          ${this._renderDirection(direction, pending)}
        `
      )}
      ${this._renderDirectionPowerNote()}

      <wa-divider></wa-divider>

      <div class="group">
        ${this._renderName(
          labelStatistic,
          labelStatistic &&
            computeEnergyLabel(
              this._states,
              this._formatEntityName,
              labelStatistic,
              this.params.statsMetadata?.[labelStatistic]
            )
        )}
        ${this._renderStateOfCharge()}
      </div>
    `;
  }

  private _renderDirection(
    direction: BatteryDirection,
    pending: PowerIntegral<BatteryEnergyKey>[]
  ) {
    const key =
      `ui.panel.config.energy.battery.dialog.directions.${direction.key}` as const;
    const energy = this._source![direction.energy];
    const power = this._directionPower[direction.power];
    const energyNeeded =
      !!power &&
      !energy &&
      !pending.some((item) => item.energy === direction.energy);
    const missingSource = MISSING_SOURCE[direction.key];

    return html`
      <div class="group">
        <div class="group-header">
          <h3>${this._localize(`${key}.title`)}</h3>
          <p>
            ${this._localize(
              "ui.panel.config.energy.battery.dialog.direction_hint"
            )}
          </p>
        </div>
        ${
          missingSource &&
          (energy || power) &&
          !this.params[missingSource.param]
            ? html`<ha-alert alert-type="warning">
                ${this._localize(missingSource.warning)}
              </ha-alert>`
            : nothing
        }
        <ha-statistic-picker
          data-direction=${direction.key}
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          .includeUnitClass=${energyUnitClasses}
          .value=${energy}
          .label=${this._localize(`${key}.energy`)}
          .excludeStatistics=${this._directionExclude(direction.energy)}
          .invalid=${energyNeeded}
          .errorMessage=${this._localize(
            "ui.panel.config.energy.battery.dialog.direction_energy_needed"
          )}
          .helper=${this._localize(`${key}.helper`, {
            unit: this._energy_units?.join(", ") || "",
          })}
          .disabled=${this._saving}
          @value-changed=${this._directionEnergyChanged}
        ></ha-statistic-picker>
        <ha-statistic-picker
          data-direction=${direction.key}
          .includeUnitClass=${powerUnitClasses}
          entities-only
          .value=${power}
          .label=${this._localize(`${key}.power`)}
          .excludeStatistics=${this._directionExclude(direction.power)}
          .helper=${this._localize(`${key}.helper`, {
            unit: this._power_units?.join(", ") || "",
          })}
          .disabled=${this._saving}
          @value-changed=${this._directionPowerChanged}
        ></ha-statistic-picker>
      </div>
    `;
  }

  private _renderDirectionPowerNote() {
    if (!BATTERY_DIRECTIONS.some(({ power }) => this._directionPower[power])) {
      return nothing;
    }
    const helperEntityId = getPowerHelperEntityId(
      this.params.source,
      this._directionPower
    );
    return html`
      <div class="power-note">
        <p>
          ${this._localize(
            "ui.panel.config.energy.battery.dialog.helper_sensor_note"
          )}
        </p>
        ${
          helperEntityId
            ? html`<p>
                ${this._localize(
                  "ui.panel.config.energy.battery.dialog.helper_sensor_in_use",
                  {
                    entity: html`<button
                      class="link"
                      @click=${this._showHelperSensor}
                    >
                      ${helperEntityId}
                    </button>`,
                  }
                )}
              </p>`
            : nothing
        }
      </div>
    `;
  }

  private _renderName(
    labelStatistic: string | undefined,
    placeholder: string | undefined
  ) {
    return html`
      <ha-input
        .label=${this._localize(
          "ui.panel.config.energy.battery.dialog.display_name"
        )}
        type="text"
        .disabled=${!labelStatistic || this._saving}
        .value=${this._source!.name || ""}
        .placeholder=${placeholder || ""}
        @input=${this._nameChanged}
      >
      </ha-input>
    `;
  }

  private _renderStateOfCharge() {
    const source = this._source!;
    return html`
      <ha-statistic-picker
        .helpMissingEntityUrl=${energyStatisticHelpUrl}
        .value=${source.stat_soc}
        .includeStatisticsUnitOfMeasurement=${socStatisticsUnits}
        .includeDeviceClass=${socDeviceClass}
        .label=${this._localize(
          "ui.panel.config.energy.battery.dialog.state_of_charge"
        )}
        .helper=${this._localize(
          "ui.panel.config.energy.battery.dialog.state_of_charge_helper"
        )}
        @value-changed=${this._statisticSocChanged}
        .disabled=${this._saving}
      ></ha-statistic-picker>
      <ha-input
        .value=${source.capacity != null ? String(source.capacity) : ""}
        .label=${this._localize(
          "ui.panel.config.energy.battery.dialog.capacity"
        )}
        .hint=${this._localize(
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
    `;
  }

  private _exclude(...ids: (string | undefined)[]): string[] {
    return [...this._excludeList, ...ids].filter((id): id is string =>
      Boolean(id)
    );
  }

  // Every other direction field of this battery, and its generated power sensor
  private _directionExclude(
    field: BatteryDirection["energy"] | BatteryDirection["power"]
  ): string[] {
    return this._exclude(
      ...BATTERY_DIRECTIONS.flatMap(({ energy, power }) => [
        energy === field ? undefined : this._source![energy],
        power === field ? undefined : this._directionPower[power],
      ]),
      this._generatedStatRate
    );
  }

  private _isValid(pending: PowerIntegral<BatteryEnergyKey>[]): boolean {
    const source = this._source;
    if (!source || !this._mode) {
      return false;
    }
    // Energy fields can be provided by power sensors
    const isProvided = (energy: BatteryEnergyKey) =>
      !!source[energy] || pending.some((item) => item.energy === energy);

    if (this._mode === "total") {
      return (
        isProvided("stat_energy_from") &&
        isProvided("stat_energy_to") &&
        isPowerConfigValid(this._powerType, this._powerConfig)
      );
    }

    const provided = BATTERY_DIRECTIONS.filter(({ energy }) =>
      isProvided(energy)
    );
    if (
      !provided.some(({ charge }) => charge) ||
      !provided.some(({ charge }) => !charge)
    ) {
      return false;
    }
    if (
      BATTERY_DIRECTIONS.some(
        ({ energy, power }) =>
          this._directionPower[power] && !isProvided(energy)
      )
    ) {
      return false;
    }
    const ids = BATTERY_DIRECTIONS.flatMap(({ energy, power }) => [
      source[energy],
      this._directionPower[power],
    ]).filter(Boolean);
    return new Set(ids).size === ids.length;
  }

  private async _updateMetadata(statId: string) {
    if (
      statId &&
      isExternalStatistic(statId) &&
      this.params.statsMetadata &&
      !(statId in this.params.statsMetadata)
    ) {
      const [metadata] = await getStatisticMetadata(this._api.callWS, [statId]);
      if (metadata) {
        this.params.statsMetadata[statId] = metadata;
        this.requestUpdate();
      }
    }
  }

  private _modeChanged(ev: HaSelectSelectEvent<BatteryMode>) {
    this._mode = ev.detail.value;
    this._updateFormDirtyState();
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

  private _directionEnergyChanged(
    ev: ValueChangedEvent<string> & HASSDomCurrentTargetEvent<HaStatisticPicker>
  ) {
    const direction = BATTERY_DIRECTIONS.find(
      ({ key }) => key === ev.currentTarget.dataset.direction
    );
    if (!direction) {
      return;
    }
    const source = { ...this._source! };
    if (ev.detail.value) {
      source[direction.energy] = ev.detail.value;
    } else {
      delete source[direction.energy];
    }
    this._source = source;
    this._updateMetadata(ev.detail.value);
    this._updateFormDirtyState();
  }

  private _directionPowerChanged(
    ev: ValueChangedEvent<string> & HASSDomCurrentTargetEvent<HaStatisticPicker>
  ) {
    const direction = BATTERY_DIRECTIONS.find(
      ({ key }) => key === ev.currentTarget.dataset.direction
    );
    if (!direction) {
      return;
    }
    const directionPower = { ...this._directionPower };
    if (ev.detail.value) {
      directionPower[direction.power] = ev.detail.value;
    } else {
      delete directionPower[direction.power];
    }
    this._directionPower = directionPower;
    this._updateFormDirtyState();
  }

  private _showHelperSensor() {
    const entityId = getPowerHelperEntityId(
      this.params.source,
      this._directionPower
    );
    if (entityId) {
      fireEvent(this, "hass-more-info", { entityId });
    }
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
    this._updateDirtyState(this._formState());
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

  public async save(): Promise<boolean> {
    const mode = this._mode;
    if (!mode) {
      return false;
    }
    // The editor can be replaced while saving, but created helpers must still
    // be saved with the submitted source
    const params = this.params;
    const power = this._power;
    let draft = this._source!;
    const isCurrent = () => this.params === params && this.isConnected;
    this._error = undefined;
    this._saving = true;
    try {
      const pending = this._pending ?? [];
      if (pending.length) {
        const sensors = await this._energyFromPower(draft, mode, pending);
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

      await params.saveCallback(toSource(draft, mode, power));
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
    draft: BatteryDraft,
    mode: BatteryMode,
    pending: PowerIntegral<BatteryEnergyKey>[]
  ): Promise<string[] | undefined> {
    return confirmIntegrals(this, {
      api: this._api,
      localize: this._localize,
      formatEntityName: this._formatEntityName,
      deviceClass: "energy",
      states: this._states,
      entities: this._entities,
      requests: pending.map(({ energy, rate, units }) => ({
        rate,
        units,
        name: this._localize(ENERGY_NAME_KEYS[energy], {
          name: computeEnergyLabel(
            this._states,
            this._formatEntityName,
            rate,
            this.params.statsMetadata?.[rate],
            draft.name
          ),
        }),
      })),
      intro: this._localize(
        mode === "total"
          ? "ui.panel.config.energy.battery.dialog.energy_sensors_needed"
          : "ui.panel.config.energy.battery.dialog.energy_sensors_needed_directions"
      ),
      // No energy field may reuse the statistic of another
      exclude: this._exclude(
        ...activeEnergyKeys(mode).map((energy) => draft[energy])
      ),
      statsMetadata: this.params.statsMetadata,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      energyEditorStyles,
      buttonLinkStyle,
      css`
        .intro {
          margin: 0;
        }
        .power-note {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-2);
          color: var(--secondary-text-color);
          font-size: 0.875em;
        }
        .power-note p {
          margin: 0;
        }
        .power-note button.link {
          color: var(--primary-color);
          /* entity ids offer no break opportunities of their own */
          overflow-wrap: anywhere;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-battery-source-editor": HaEnergyBatterySourceEditor;
  }
}
