import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { HASSDomCurrentTargetEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-markdown";
import "../../../../components/ha-dialog";
import "../../../../components/radio/ha-radio-group";
import type { HaRadioGroup } from "../../../../components/radio/ha-radio-group";
import "../../../../components/radio/ha-radio-option";
import "../../../../components/input/ha-input";
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
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { DirtyStateProviderMixin } from "../../../../mixins/dirty-state-provider-mixin";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import type { EnergySettingsWaterDialogParams } from "./show-dialogs-energy";
import type { HaInput } from "../../../../components/input/ha-input";
import type { IntegralUnits } from "./energy-integral";
import { confirmIntegrals, integralUnits } from "./energy-integral";

type CostType = "no-costs" | "number" | "entity" | "statistic";

interface WaterFormState {
  source: WaterSourceTypeEnergyPreference;
  costs: CostType;
}

const flowRateUnitClasses = ["volume_flow_rate"];

@customElement("dialog-energy-water-settings")
export class DialogEnergyWaterSettings
  extends DirtyStateProviderMixin<WaterFormState>()(LitElement)
  implements HassDialog<EnergySettingsWaterDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EnergySettingsWaterDialogParams;

  @state() private _open = false;

  @state() private _source?: WaterSourceTypeEnergyPreference;

  @state() private _costs?: CostType;

  @state() private _numberPriceText = "";

  @state() private _water_units?: string[];

  @state() private _flow_rate_units?: string[];

  @state() private _error?: string;

  @state() private _saving = false;

  private _excludeList?: string[];

  private _excludeListFlowRate?: string[];

  public async showDialog(
    params: EnergySettingsWaterDialogParams
  ): Promise<void> {
    this._params = params;
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
    this._water_units = (
      await getSensorDeviceClassConvertibleUnits(this.hass, "water")
    ).units;
    this._flow_rate_units = (
      await getSensorDeviceClassConvertibleUnits(this.hass, "volume_flow_rate")
    ).units;
    this._excludeList = this._params.water_sources
      .map((entry) => entry.stat_energy_from)
      .filter((id) => id !== this._source?.stat_energy_from);
    this._excludeListFlowRate = this._params.water_sources
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
    this._error = undefined;
    this._excludeList = undefined;
    this._excludeListFlowRate = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params || !this._source) {
      return nothing;
    }

    const pickableUnit = this._water_units?.join(", ") || "";

    const unitPriceFixed = `${this.hass.config.currency}/${
      this.hass.config.unit_system.volume === "gal" ? "gal" : "m³"
    }`;

    const externalSource =
      this._source.stat_energy_from &&
      isExternalStatistic(this._source.stat_energy_from);

    const labelStatistic =
      this._source.stat_energy_from || this._source.stat_rate;

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.energy.water.dialog.header"
        )}
        .preventScrimClose=${this.isDirtyState}
        @closed=${this._dialogClosed}
      >
        ${this._error ? html`<p class="error">${this._error}</p>` : ""}

        <ha-statistic-picker
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          include-unit-class="volume"
          include-device-class="water"
          .value=${this._source.stat_energy_from}
          .label=${this.hass.localize(
            "ui.panel.config.energy.water.dialog.water_usage"
          )}
          .excludeStatistics=${this._excludeList}
          @value-changed=${this._statisticChanged}
          .disabled=${this._saving}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.water.dialog.entity_para",
            { unit: pickableUnit }
          )}
          autofocus
        ></ha-statistic-picker>

        <ha-statistic-picker
          .includeUnitClass=${flowRateUnitClasses}
          .value=${this._source.stat_rate}
          .label=${this.hass.localize(
            "ui.panel.config.energy.water.dialog.water_flow_rate"
          )}
          .excludeStatistics=${this._excludeListFlowRate}
          @value-changed=${this._flowRateStatisticChanged}
          .disabled=${this._saving}
          .invalid=${!!this._flowRateError()}
          .errorMessage=${this._flowRateError()}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.water.dialog.flow_rate_para",
            { unit: this._flow_rate_units?.join(", ") || "" }
          )}
        ></ha-statistic-picker>

        <ha-input
          .label=${this.hass.localize(
            "ui.panel.config.energy.water.dialog.display_name"
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
            "ui.panel.config.energy.water.dialog.cost_para"
          )}
          .value=${this._costs}
          name="costs"
          @change=${this._handleCostChanged}
        >
          <ha-radio-option value="no-costs">
            ${this.hass.localize("ui.panel.config.energy.water.dialog.no_cost")}
          </ha-radio-option>
          <ha-radio-option value="statistic">
            ${this.hass.localize(
              "ui.panel.config.energy.water.dialog.cost_stat"
            )}
          </ha-radio-option>
          <ha-radio-option value="entity" .disabled=${externalSource}>
            ${this.hass.localize(
              "ui.panel.config.energy.water.dialog.cost_entity"
            )}
          </ha-radio-option>
          <ha-radio-option value="number" .disabled=${externalSource}>
            ${this.hass.localize(
              "ui.panel.config.energy.water.dialog.cost_number"
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
                  "ui.panel.config.energy.water.dialog.cost_stat_input"
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
                    "ui.panel.config.energy.water.dialog.cost_entity_input"
                  )}
                  .helper=${html`<ha-markdown
                    .content=${this.hass.localize(
                      "ui.panel.config.energy.water.dialog.cost_entity_helper",
                      { currency: this.hass.config.currency }
                    )}
                  ></ha-markdown>`}
                  @value-changed=${this._priceEntityChanged}
                ></ha-entity-picker>`
              : this._costs === "number"
                ? html`<ha-input
                    .disabled=${this._saving}
                    .label=${`${this.hass.localize(
                      "ui.panel.config.energy.water.dialog.cost_number_input"
                    )} (${unitPriceFixed})`}
                    class="price-options"
                    step="any"
                    type="number"
                    required
                    auto-validate
                    .value=${this._numberPriceText}
                    @input=${this._numberPriceChanged}
                  >
                    <span slot="end">${unitPriceFixed}</span>
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
      this._params?.statsMetadata &&
      !(ev.detail.value in this._params.statsMetadata)
    ) {
      const [metadata] = await getStatisticMetadata(this.hass.callWS, [
        ev.detail.value,
      ]);
      if (metadata) {
        this._params.statsMetadata[ev.detail.value] = metadata;
        this.requestUpdate("_params");
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
    this._updateDirtyState({ source: this._source!, costs: this._costs! });
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
    return this.hass.localize(
      "ui.panel.config.energy.water.dialog.flow_rate_no_volume"
    );
  }

  private _integralUnits(): IntegralUnits | undefined {
    const statRate = this._source?.stat_rate;
    if (!statRate || !this._water_units) {
      return undefined;
    }
    return integralUnits(
      this.hass.states[statRate]?.attributes.unit_of_measurement,
      this._water_units
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
        const statEnergyFrom = await this._waterFromFlowRate(source);
        if (!statEnergyFrom) {
          return;
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

  private async _waterFromFlowRate(
    draft: WaterSourceTypeEnergyPreference
  ): Promise<string | undefined> {
    const statRate = draft.stat_rate!;
    const units = this._integralUnits();
    if (!units) {
      return undefined;
    }
    const sensors = await confirmIntegrals(this, this.hass, {
      deviceClass: "water",
      states: this.hass.states,
      entities: this.hass.entities,
      requests: [
        {
          rate: statRate,
          units,
          name: this.hass.localize(
            "ui.panel.config.energy.integral.water.sensor_name",
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
        "ui.panel.config.energy.water.dialog.water_sensor_needed"
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
    "dialog-energy-water-settings": DialogEnergyWaterSettings;
  }
}
