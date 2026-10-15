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
import type { HeatSourceTypeEnergyPreference } from "../../../../data/energy";
import {
  emptyHeatEnergyPreference,
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
import type { EnergySettingsHeatDialogParams } from "./show-dialogs-energy";
import type { HaInput } from "../../../../components/input/ha-input";

type CostType = "no-costs" | "number" | "entity" | "statistic";

interface HeatFormState {
  source: HeatSourceTypeEnergyPreference;
  costs: CostType;
}

const heatDeviceClasses = ["energy", "gas", "volume", "weight"];
const heatUnitClasses = ["energy", "volume", "mass"];
// Fuel units supported by the energy integration for heat sources.
const heatVolumeUnits = ["CCF", "ft³", "m³", "gal", "L", "MCF"];
const heatMassUnits = ["kg", "lb"];

const PRICE_HELPER = {
  energy: {
    classKey: "ui.panel.config.energy.heat.dialog.cost_entity_helper_energy",
    unit1: "kWh",
    unit2: "Wh",
  },
  volume: {
    classKey: "ui.panel.config.energy.heat.dialog.cost_entity_helper_volume",
    unit1: "L",
    unit2: "m³",
  },
  mass: {
    classKey: "ui.panel.config.energy.heat.dialog.cost_entity_helper_mass",
    unit1: "kg",
    unit2: "lb",
  },
} as const;

@customElement("dialog-energy-heat-settings")
export class DialogEnergyHeatSettings
  extends DirtyStateProviderMixin<HeatFormState>()(LitElement)
  implements HassDialog<EnergySettingsHeatDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EnergySettingsHeatDialogParams;

  @state() private _open = false;

  @state() private _source?: HeatSourceTypeEnergyPreference;

  @state() private _costs?: CostType;

  @state() private _numberPriceText = "";

  @state() private _pickedDisplayUnit?: string | null;

  @state() private _energy_units?: string[];

  @state() private _error?: string;

  private _excludeList?: string[];

  public async showDialog(
    params: EnergySettingsHeatDialogParams
  ): Promise<void> {
    this._params = params;
    this._source = params.source
      ? { ...params.source }
      : emptyHeatEnergyPreference();
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
    this._excludeList = this._params.heat_sources
      .map((entry) => entry.stat_energy_from)
      .filter((id) => id !== this._source?.stat_energy_from)
      .concat(this._params.gas_statistics);

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
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params || !this._source) {
      return nothing;
    }

    const unitsByClass = {
      energy: this._energy_units || [],
      volume: heatVolumeUnits,
      mass: heatMassUnits,
    };
    const pickableUnit = (
      this._params.allowedHeatUnitClass === undefined
        ? Object.values(unitsByClass).flat()
        : unitsByClass[this._params.allowedHeatUnitClass]
    ).join(", ");

    const unitPrice = this._pickedDisplayUnit
      ? `${this.hass.config.currency}/${this._pickedDisplayUnit}`
      : undefined;

    const pickedUnitClass = this._pickedDisplayUnit
      ? (Object.keys(unitsByClass) as (keyof typeof unitsByClass)[]).find(
          (unitClass) =>
            unitsByClass[unitClass].includes(this._pickedDisplayUnit!)
        )
      : undefined;

    const externalSource =
      this._source.stat_energy_from &&
      isExternalStatistic(this._source.stat_energy_from);

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.energy.heat.dialog.header"
        )}
        .preventScrimClose=${this.isDirtyState}
        @closed=${this._dialogClosed}
      >
        ${this._error ? html`<p class="error">${this._error}</p>` : ""}
        <div>
          <p>
            ${this.hass.localize("ui.panel.config.energy.heat.dialog.paragraph")}
          </p>
          <p>
            ${this.hass.localize("ui.panel.config.energy.heat.dialog.note_para")}
          </p>
        </div>

        <ha-statistic-picker
          .hass=${this.hass}
          statistic-types="sum"
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          .includeUnitClass=${
            this._params.allowedHeatUnitClass || heatUnitClasses
          }
          .includeDeviceClass=${heatDeviceClasses}
          .value=${this._source.stat_energy_from}
          .label=${this.hass.localize(
            "ui.panel.config.energy.heat.dialog.heat_usage"
          )}
          .excludeStatistics=${this._excludeList}
          @value-changed=${this._statisticChanged}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.heat.dialog.entity_para",
            { unit: pickableUnit }
          )}
          autofocus
        ></ha-statistic-picker>

        <ha-input
          .label=${this.hass.localize(
            "ui.panel.config.energy.heat.dialog.display_name"
          )}
          type="text"
          .disabled=${!this._source?.stat_energy_from}
          .value=${this._source?.name || ""}
          .placeholder=${
            this._source?.stat_energy_from
              ? getStatisticLabel(
                  this.hass.states,
                  this.hass.formatEntityName,
                  this._source.stat_energy_from,
                  this._params?.statsMetadata?.[this._source.stat_energy_from]
                )
              : ""
          }
          @input=${this._nameChanged}
        >
        </ha-input>

        <ha-radio-group
          .label=${this.hass.localize(
            "ui.panel.config.energy.heat.dialog.cost_para"
          )}
          .value=${this._costs}
          name="costs"
          @change=${this._handleCostChanged}
        >
          <ha-radio-option value="no-costs">
            ${this.hass.localize("ui.panel.config.energy.heat.dialog.no_cost")}
          </ha-radio-option>
          <ha-radio-option value="statistic">
            ${this.hass.localize("ui.panel.config.energy.heat.dialog.cost_stat")}
          </ha-radio-option>
          <ha-radio-option value="entity" .disabled=${externalSource}>
            ${this.hass.localize(
              "ui.panel.config.energy.heat.dialog.cost_entity"
            )}
          </ha-radio-option>
          <ha-radio-option value="number" .disabled=${externalSource}>
            ${this.hass.localize(
              "ui.panel.config.energy.heat.dialog.cost_number"
            )}
          </ha-radio-option>
        </ha-radio-group>
        ${
          this._costs === "statistic"
            ? html`<ha-statistic-picker
                class="price-options"
                .hass=${this.hass}
                statistic-types="sum"
                .value=${this._source.stat_cost}
                .label=${`${this.hass.localize(
                  "ui.panel.config.energy.heat.dialog.cost_stat_input"
                )} (${this.hass.config.currency})`}
                @value-changed=${this._priceStatChanged}
              ></ha-statistic-picker>`
            : this._costs === "entity"
              ? html`<ha-entity-picker
                  class="price-options"
                  include-domains='["sensor", "input_number"]'
                  .value=${this._source.entity_energy_price}
                  .label=${this.hass.localize(
                    "ui.panel.config.energy.heat.dialog.cost_entity_input"
                  )}
                  .helper=${
                    pickedUnitClass
                      ? html`<ha-markdown
                          .content=${this.hass.localize(
                            "ui.panel.config.energy.heat.dialog.cost_entity_helper",
                            {
                              currency: this.hass.config.currency,
                              class: this.hass.localize(
                                PRICE_HELPER[pickedUnitClass].classKey
                              ),
                              unit1: PRICE_HELPER[pickedUnitClass].unit1,
                              unit2: PRICE_HELPER[pickedUnitClass].unit2,
                            }
                          )}
                        ></ha-markdown>`
                      : nothing
                  }
                  @value-changed=${this._priceEntityChanged}
                ></ha-entity-picker>`
              : this._costs === "number"
                ? html`<ha-input
                    .label=${`${this.hass.localize(
                      "ui.panel.config.energy.heat.dialog.cost_number_input"
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
              !this._source!.stat_energy_from ||
              (this._costs === "number" &&
                typeof this._source!.number_energy_price !== "number") ||
              (this._costs === "entity" &&
                !this._source!.entity_energy_price) ||
              (this._costs === "statistic" && !this._source!.stat_cost) ||
              (!!this._params?.source && !this.isDirtyState)
            }
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

  private async _statisticChanged(ev: ValueChangedEvent<string>) {
    const statisticId = ev.detail.value;
    this._source = {
      ...this._source!,
      stat_energy_from: statisticId,
    };
    this._updateFormDirtyState();
    if (!statisticId) {
      this._pickedDisplayUnit = undefined;
      return;
    }
    const [metadata] = await getStatisticMetadata(this.hass.callWS, [
      statisticId,
    ]);
    // Ignore the response if the selection changed or the dialog closed
    if (this._source?.stat_energy_from !== statisticId) {
      return;
    }
    if (
      metadata &&
      isExternalStatistic(statisticId) &&
      this._params?.statsMetadata &&
      !(statisticId in this._params.statsMetadata)
    ) {
      this._params.statsMetadata[statisticId] = metadata;
      this.requestUpdate("_params");
    }
    this._pickedDisplayUnit = getDisplayUnit(
      this.hass.states,
      statisticId,
      metadata
    );
    if (isExternalStatistic(statisticId) && this._costs !== "statistic") {
      this._costs = "no-costs";
      this._updateFormDirtyState();
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

  private _updateFormDirtyState(): void {
    this._updateDirtyState({ source: this._source!, costs: this._costs! });
  }

  private async _save() {
    try {
      if (this._costs === "no-costs") {
        this._source!.entity_energy_price = null;
        this._source!.number_energy_price = null;
        this._source!.stat_cost = null;
        this._numberPriceText = "";
      }
      await this._params!.saveCallback(this._source!);
      this._markDirtyStateClean();
      this.closeDialog();
    } catch (err: any) {
      this._error = err.message;
    }
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
    "dialog-energy-heat-settings": DialogEnergyHeatSettings;
  }
}
