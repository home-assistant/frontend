import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { HASSDomCurrentTargetEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-markdown";
import "../../../../components/radio/ha-radio-group";
import type { HaRadioGroup } from "../../../../components/radio/ha-radio-group";
import "../../../../components/radio/ha-radio-option";
import "../../../../components/input/ha-input";
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
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { DirtyStateProviderMixin } from "../../../../mixins/dirty-state-provider-mixin";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import type { EnergySettingsGasDialogParams } from "./show-dialogs-energy";
import type { HaInput } from "../../../../components/input/ha-input";
import type { IntegralUnits } from "./energy-integral";
import {
  confirmIntegrals,
  findIntegral,
  integralTotalUnit,
  integralUnits,
} from "./energy-integral";

type CostType = "no-costs" | "number" | "entity" | "statistic";

interface GasFormState {
  source: GasSourceTypeEnergyPreference;
  costs: CostType;
}

const gasDeviceClasses = ["gas", "energy"];
const gasUnitClasses = ["volume", "energy"];
const flowRateUnitClasses = ["volume_flow_rate"];

@customElement("dialog-energy-gas-settings")
export class DialogEnergyGasSettings
  extends DirtyStateProviderMixin<GasFormState>()(LitElement)
  implements HassDialog<EnergySettingsGasDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EnergySettingsGasDialogParams;

  @state() private _open = false;

  @state() private _source?: GasSourceTypeEnergyPreference;

  @state() private _costs?: CostType;

  @state() private _numberPriceText = "";

  @state() private _pickedDisplayUnit?: string | null;

  @state() private _energy_units?: string[];

  @state() private _gas_units?: string[];

  @state() private _flow_rate_units?: string[];

  @state() private _error?: string;

  @state() private _saving = false;

  private _excludeList?: string[];

  private _excludeListFlowRate?: string[];

  public async showDialog(
    params: EnergySettingsGasDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._saving = false;
    this._source = params.source
      ? { ...params.source }
      : emptyGasEnergyPreference();
    this._pickedDisplayUnit = getDisplayUnit(
      this.hass.states,
      params.source?.stat_energy_from,
      params.source?.stat_energy_from
        ? params.statsMetadata?.[params.source?.stat_energy_from]
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
    this._energy_units = (
      await getSensorDeviceClassConvertibleUnits(this.hass, "energy")
    ).units;
    this._gas_units = (
      await getSensorDeviceClassConvertibleUnits(this.hass, "gas")
    ).units;
    this._flow_rate_units = (
      await getSensorDeviceClassConvertibleUnits(this.hass, "volume_flow_rate")
    ).units;
    this._excludeList = this._params.gas_sources
      .map((entry) => entry.stat_energy_from)
      .filter((id) => id !== this._source?.stat_energy_from);
    this._excludeListFlowRate = this._params.gas_sources
      .map((entry) => entry.stat_rate)
      .filter((id) => id && id !== this._source?.stat_rate) as string[];

    this._open = true;
    this._initDirtyTracking(
      { type: "deep" },
      { source: this._source!, costs: this._costs! }
    );
  }

  public closeDialog() {
    this._open = false;
    return true;
  }

  private _dialogClosed() {
    this._params = undefined;
    this._source = undefined;
    this._pickedDisplayUnit = undefined;
    this._error = undefined;
    this._excludeList = undefined;
    this._excludeListFlowRate = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params || !this._source) {
      return nothing;
    }

    const pickableUnit =
      this._params.allowedGasUnitClass === undefined
        ? [...(this._gas_units || []), ...(this._energy_units || [])].join(", ")
        : this._params.allowedGasUnitClass === "energy"
          ? this._energy_units?.join(", ") || ""
          : this._gas_units?.join(", ") || "";

    const displayUnit = this._source.stat_energy_from
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

    const labelStatistic =
      this._source.stat_energy_from || this._source.stat_rate;

    const externalSource =
      this._source.stat_energy_from &&
      isExternalStatistic(this._source.stat_energy_from);

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.energy.gas.dialog.header"
        )}
        .preventScrimClose=${this.isDirtyState}
        @closed=${this._dialogClosed}
      >
        ${this._error ? html`<p class="error">${this._error}</p>` : ""}
        <div>
          <p>
            ${this.hass.localize("ui.panel.config.energy.gas.dialog.paragraph")}
          </p>
          <p>
            ${this.hass.localize("ui.panel.config.energy.gas.dialog.note_para")}
          </p>
        </div>

        <ha-statistic-picker
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          .includeUnitClass=${
            this._params.allowedGasUnitClass || gasUnitClasses
          }
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
          autofocus
        ></ha-statistic-picker>

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

        <ha-input
          .label=${this.hass.localize(
            "ui.panel.config.energy.gas.dialog.display_name"
          )}
          type="text"
          .disabled=${!labelStatistic || this._saving}
          .value=${this._source?.name || ""}
          .placeholder=${
            labelStatistic
              ? getStatisticLabel(
                  this.hass.states,
                  this.hass.formatEntityName,
                  labelStatistic,
                  this._params?.statsMetadata?.[labelStatistic]
                )
              : ""
          }
          @input=${this._nameChanged}
        >
        </ha-input>

        <ha-radio-group
          .disabled=${this._saving}
          .label=${this.hass.localize(
            "ui.panel.config.energy.gas.dialog.cost_para"
          )}
          .value=${this._costs}
          name="costs"
          @change=${this._handleCostChanged}
        >
          <ha-radio-option value="no-costs">
            ${this.hass.localize("ui.panel.config.energy.gas.dialog.no_cost")}
          </ha-radio-option>
          <ha-radio-option value="statistic">
            ${this.hass.localize("ui.panel.config.energy.gas.dialog.cost_stat")}
          </ha-radio-option>
          <ha-radio-option value="entity" .disabled=${externalSource}>
            ${this.hass.localize(
              "ui.panel.config.energy.gas.dialog.cost_entity"
            )}
          </ha-radio-option>
          <ha-radio-option value="number" .disabled=${externalSource}>
            ${this.hass.localize(
              "ui.panel.config.energy.gas.dialog.cost_number"
            )}
          </ha-radio-option>
        </ha-radio-group>
        ${
          this._costs === "statistic"
            ? html`<ha-statistic-picker
                .disabled=${this._saving}
                class="price-options"
                statistic-types="sum"
                .value=${this._source.stat_cost}
                .label=${`${this.hass.localize(
                  "ui.panel.config.energy.gas.dialog.cost_stat_input"
                )} (${this.hass.config.currency})`}
                @value-changed=${this._priceStatChanged}
              ></ha-statistic-picker>`
            : this._costs === "entity"
              ? html`<ha-entity-picker
                  .disabled=${this._saving}
                  class="price-options"
                  include-domains='["sensor", "input_number"]'
                  .value=${this._source.entity_energy_price}
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
                ></ha-entity-picker>`
              : this._costs === "number"
                ? html`<ha-input
                    .disabled=${this._saving}
                    .label=${`${this.hass.localize(
                      "ui.panel.config.energy.gas.dialog.cost_number_input"
                    )} ${unitPrice ? ` (${unitPrice})` : ""}`}
                    class="price-options"
                    step="any"
                    type="number"
                    required
                    auto-validate
                    .value=${this._numberPriceText}
                    @input=${this._numberPriceChanged}
                  >
                    ${
                      unitPrice
                        ? html`<span slot="end">${unitPrice}</span>`
                        : nothing
                    }
                  </ha-input>`
                : nothing
        }

        <ha-dialog-footer slot="footer">
          <ha-button
            appearance="plain"
            @click=${this.closeDialog}
            slot="secondaryAction"
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            @click=${this._save}
            .disabled=${
              this._saving ||
              !(this._source!.stat_energy_from || this._integralUnits()) ||
              (this._costs === "number" &&
                typeof this._source!.number_energy_price !== "number") ||
              (!!this._params?.source && !this.isDirtyState)
            }
            .loading=${this._saving}
            slot="primaryAction"
          >
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _handleCostChanged(ev: HASSDomCurrentTargetEvent<HaRadioGroup>) {
    this._costs = (ev.currentTarget as HaRadioGroup).value as CostType;
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
        this._params?.statsMetadata &&
        !(ev.detail.value in this._params.statsMetadata)
      ) {
        this._params.statsMetadata[ev.detail.value] = metadata;
        this.requestUpdate("_params");
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
    this._updateDirtyState({ source: this._source!, costs: this._costs! });
  }

  private _integralUnits(): IntegralUnits | undefined {
    const statRate = this._source?.stat_rate;
    // Gas sources can't mix volume and energy units
    if (
      !statRate ||
      !this._gas_units ||
      this._params?.allowedGasUnitClass === "energy"
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
      this._params?.allowedGasUnitClass === "energy"
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

  private async _save() {
    // Closing or reopening the dialog replaces its state, but a created helper
    // must still be saved with the submitted source
    const params = this._params!;
    const costs = this._costs;
    let source = this._source!;
    const isCurrent = () => this._params === params;
    this._error = undefined;
    this._saving = true;
    try {
      if (!source.stat_energy_from) {
        const statEnergyFrom = await this._gasFromFlowRate(source);
        if (!statEnergyFrom) {
          return;
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
        this.closeDialog();
      }
    } catch (err: any) {
      if (isCurrent()) {
        this._error = err.message;
      }
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
      states: this.hass.states,
      entities: this.hass.entities,
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
                this._params?.statsMetadata?.[statRate],
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
      statsMetadata: this._params?.statsMetadata,
    });
    return sensors?.[0];
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-statistic-picker {
          display: block;
          margin-bottom: var(--ha-space-4);
        }
        ha-radio-group {
          margin-top: var(--ha-space-4);
        }
        .price-options {
          display: block;
          margin-top: var(--ha-space-3);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-energy-gas-settings": DialogEnergyGasSettings;
  }
}
