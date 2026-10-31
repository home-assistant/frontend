import "@home-assistant/webawesome/dist/components/divider/divider";
import type { ContextType } from "@lit/context";
import { mdiPlus } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import { transform } from "../../../../common/decorators/transform";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-checkbox";
import type { HaCheckbox } from "../../../../components/ha-checkbox";
import "../../../../components/ha-svg-icon";
import "../../../../components/input/ha-input";
import type { HaInput } from "../../../../components/input/ha-input";
import type { ConfigEntry } from "../../../../data/config_entries";
import { getConfigEntries } from "../../../../data/config_entries";
import type { SolarSourceTypeEnergyPreference } from "../../../../data/energy";
import {
  computeEnergyLabel,
  emptySolarEnergyPreference,
  energyStatisticHelpUrl,
} from "../../../../data/energy";
import { domainToName } from "../../../../data/integration";
import {
  getStatisticLabel,
  getStatisticMetadata,
  isExternalStatistic,
} from "../../../../data/recorder";
import { getSensorDeviceClassConvertibleUnits } from "../../../../data/sensor";
import { showConfigFlowDialog } from "../../../../dialogs/config-flow/show-dialog-config-flow";
import {
  apiContext,
  brandsAccessTokenContext,
  connectionContext,
  entitiesContext,
  formattersContext,
  statesContext,
  uiContext,
} from "../../../../data/context";
import { DirtyStateProviderMixin } from "../../../../mixins/dirty-state-provider-mixin";
import type {
  HomeAssistantApi,
  HomeAssistantFormatters,
  HomeAssistantUI,
  ValueChangedEvent,
} from "../../../../types";
import { brandsUrl } from "../../../../util/brands-url";
import type { IntegralUnits } from "../dialogs/energy-integral";
import { confirmIntegrals, integralUnits } from "../dialogs/energy-integral";
import type {
  EnergyEditorStatus,
  EnergySolarSourceEditorParams,
} from "./energy-editor";
import { EnergyEditorMixin, energyEditorStyles } from "./energy-editor";

const energyUnitClasses = ["energy"];
const powerUnitClasses = ["power"];

@customElement("ha-energy-solar-source-editor")
export class HaEnergySolarSourceEditor extends EnergyEditorMixin(
  DirtyStateProviderMixin<SolarSourceTypeEnergyPreference>()(LitElement)
) {
  @property({ attribute: false })
  public params!: EnergySolarSourceEditorParams;

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

  @consume({ context: connectionContext, subscribe: true })
  private _connection!: ContextType<typeof connectionContext>;

  @state()
  @consume({ context: uiContext, subscribe: true })
  @transform<HomeAssistantUI, boolean | undefined>({
    transformer: ({ themes }) => themes?.darkMode,
  })
  private _darkMode?: boolean;

  @state()
  @consume({ context: brandsAccessTokenContext, subscribe: true })
  // @ts-ignore re-render trigger only, its value is never read
  private _brandsAccessToken?: string;

  // Kept current without rendering on every state change
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @consume({ context: entitiesContext, subscribe: true })
  private _entities!: ContextType<typeof entitiesContext>;

  @state()
  @consume({ context: statesContext, subscribe: true })
  @transform<ContextType<typeof statesContext>, string>({
    transformer: function (this: HaEnergySolarSourceEditor, states) {
      const statRate = this._source?.stat_rate;
      return statRate
        ? states?.[statRate]?.attributes.unit_of_measurement
        : undefined;
    },
    watch: ["_source"],
  })
  private _rateUnit?: string;

  @state() private _source?: SolarSourceTypeEnergyPreference;

  @state() private _configEntries?: ConfigEntry[];

  @state() private _energy_units?: string[];

  @state() private _power_units?: string[];

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
      : emptySolarEnergyPreference();
    this._excludeList = params.solar_sources
      .map((entry) => entry.stat_energy_from)
      .filter((id) => id !== this._source?.stat_energy_from);
    this._excludeListPower = params.solar_sources
      .map((entry) => entry.stat_rate)
      .filter((id) => id && id !== this._source?.stat_rate) as string[];
    this._initDirtyTracking({ type: "deep" }, this._source);
    this._fetchSolarForecastConfigEntries();
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

  protected get editorStatus(): EnergyEditorStatus {
    return {
      dirty: this.isDirtyState,
      valid: !!(this._source?.stat_energy_from || this._integralUnits()),
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
          .includeUnitClass=${energyUnitClasses}
          .value=${this._source.stat_energy_from}
          .label=${this._localize(
            "ui.panel.config.energy.solar.dialog.solar_production_energy"
          )}
          .excludeStatistics=${this._excludeList}
          @value-changed=${this._statisticChanged}
          .disabled=${this._saving}
          .helper=${this._localize(
            "ui.panel.config.energy.solar.dialog.entity_para",
            { unit: this._energy_units?.join(", ") || "" }
          )}
        ></ha-statistic-picker>
        <ha-input
          .label=${this._localize(
            "ui.panel.config.energy.solar.dialog.display_name"
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
        .includeUnitClass=${powerUnitClasses}
        .value=${this._source.stat_rate}
        .label=${this._localize(
          "ui.panel.config.energy.solar.dialog.solar_production_power"
        )}
        .excludeStatistics=${this._excludeListPower}
        @value-changed=${this._powerStatisticChanged}
        .disabled=${this._saving}
        .helper=${this._localize(
          "ui.panel.config.energy.solar.dialog.entity_para",
          { unit: this._power_units?.join(", ") || "" }
        )}
      ></ha-statistic-picker>

      <wa-divider></wa-divider>

      <div class="group">
        <div class="group-header">
          <h3>
            ${this._localize(
              "ui.panel.config.energy.solar.dialog.solar_production_forecast"
            )}
          </h3>
          <p>
            ${this._localize(
              "ui.panel.config.energy.solar.dialog.solar_production_forecast_description"
            )}
          </p>
        </div>
        ${
          this._configEntries?.length
            ? html`<div class="forecast-options">
                ${this._configEntries.map(
                  (entry) =>
                    html`<ha-checkbox
                      .entry=${entry}
                      @change=${this._forecastCheckChanged}
                      .disabled=${this._saving}
                      .checked=${!!this._source?.config_entry_solar_forecast?.includes(
                        entry.entry_id
                      )}
                    >
                      <div class="forecast-option">
                        <img
                          alt=""
                          crossorigin="anonymous"
                          referrerpolicy="no-referrer"
                          src=${brandsUrl(
                            {
                              domain: entry.domain,
                              type: "icon",
                              darkOptimized: this._darkMode,
                            },
                            this._connection.hassUrl()
                          )}
                        />${entry.title || domainToName(this._localize, entry.domain)}
                      </div>
                    </ha-checkbox>`
                )}
              </div>`
            : nothing
        }
        <ha-button
          appearance="filled"
          size="s"
          @click=${this._addForecast}
          .disabled=${this._saving}
        >
          <ha-svg-icon .path=${mdiPlus} slot="start"></ha-svg-icon>
          ${this._localize("ui.panel.config.energy.solar.dialog.add_forecast")}
        </ha-button>
      </div>
    `;
  }

  private async _fetchSolarForecastConfigEntries() {
    const domains = this.params.info.solar_forecast_domains;
    this._configEntries =
      domains.length === 0
        ? []
        : domains.length === 1
          ? await getConfigEntries(this._api, {
              type: ["service"],
              domain: domains[0],
            })
          : (await getConfigEntries(this._api, { type: ["service"] })).filter(
              (entry) => domains.includes(entry.domain)
            );
  }

  private _forecastCheckChanged(ev) {
    const input = ev.currentTarget as HaCheckbox;
    const entry = (input as any).entry as ConfigEntry;
    const checked = input.checked;
    const list = this._source!.config_entry_solar_forecast
      ? [...this._source!.config_entry_solar_forecast]
      : [];
    if (checked) {
      list.push(entry.entry_id);
    } else {
      list.splice(list.indexOf(entry.entry_id), 1);
    }
    this._source = {
      ...this._source!,
      config_entry_solar_forecast: list.length ? list : null,
    };
    this._updateDirtyState(this._source);
  }

  private _addForecast() {
    showConfigFlowDialog(this, {
      startFlowHandler: "forecast_solar",
      dialogClosedCallback: (params) => {
        if (params.entryId) {
          const list = this._source!.config_entry_solar_forecast
            ? [...this._source!.config_entry_solar_forecast]
            : [];
          list.push(params.entryId);
          this._source = {
            ...this._source!,
            config_entry_solar_forecast: list,
          };
          this._fetchSolarForecastConfigEntries();
          this._updateDirtyState(this._source);
        }
      },
    });
  }

  private async _statisticChanged(ev: ValueChangedEvent<string>) {
    this._source = { ...this._source!, stat_energy_from: ev.detail.value };
    this._updateDirtyState(this._source);
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
  }

  private _powerStatisticChanged(ev: ValueChangedEvent<string>) {
    this._source = { ...this._source!, stat_rate: ev.detail.value };
    this._updateDirtyState(this._source);
  }

  private _nameChanged(ev: InputEvent) {
    this._source = {
      ...this._source!,
      name: (ev.target as HaInput).value,
    };
    if (!this._source.name) {
      delete this._source.name;
    }
    this._updateDirtyState(this._source);
  }

  private _integralUnits(): IntegralUnits | undefined {
    const statRate = this._source?.stat_rate;
    if (!statRate || !this._energy_units) {
      return undefined;
    }
    return integralUnits(this._rateUnit, this._energy_units);
  }

  public async save(): Promise<boolean> {
    // The editor can be replaced while saving, but a created helper must still
    // be saved with the submitted source
    const params = this.params;
    let source = this._source!;
    const isCurrent = () => this.params === params && this.isConnected;
    this._error = undefined;
    this._saving = true;
    try {
      if (!source.stat_energy_from) {
        const statEnergyFrom = await this._energyFromPower(source);
        if (!statEnergyFrom) {
          return false;
        }
        source = { ...source, stat_energy_from: statEnergyFrom };
        if (isCurrent()) {
          // Keep edits made meanwhile, only fill in the new energy sensor
          this._source = { ...this._source!, stat_energy_from: statEnergyFrom };
          this._updateDirtyState(this._source);
        }
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

  private async _energyFromPower(
    draft: SolarSourceTypeEnergyPreference
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
      deviceClass: "energy",
      states: this._states,
      entities: this._entities,
      requests: [
        {
          rate: statRate,
          units,
          name: this._localize(
            "ui.panel.config.energy.integral.energy.sensor_name",
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
        "ui.panel.config.energy.solar.dialog.energy_sensor_needed"
      ),
      exclude: this._excludeList,
      statsMetadata: this.params.statsMetadata,
    });
    return sensors?.[0];
  }

  static get styles(): CSSResultGroup {
    return [
      energyEditorStyles,
      css`
        .forecast-options {
          display: flex;
          flex-direction: column;
          min-width: 0;
          gap: var(--ha-space-2);
        }
        .forecast-options ha-checkbox {
          justify-content: center;
          min-height: 40px;
        }
        .forecast-option {
          display: flex;
          align-items: center;
          gap: var(--ha-space-4);
        }
        .forecast-option img {
          height: 24px;
        }
        ha-button {
          width: fit-content;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-solar-source-editor": HaEnergySolarSourceEditor;
  }
}
