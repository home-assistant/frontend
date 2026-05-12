import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
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
  emptyGasEnergyPreference,
  energyStatisticHelpUrl,
} from "../../../../data/energy";
import {
  getDisplayUnit,
  getStatisticMetadata,
  isExternalStatistic,
} from "../../../../data/recorder";
import { getSensorDeviceClassConvertibleUnits } from "../../../../data/sensor";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import type { EnergySettingsGasDialogParams } from "./show-dialogs-energy";
import type { HaInput } from "../../../../components/input/ha-input";

const gasDeviceClasses = ["gas", "energy"];
const gasUnitClasses = ["volume", "energy"];
const flowRateUnitClasses = ["volume_flow_rate"];

@customElement("dialog-energy-gas-settings")
export class DialogEnergyGasSettings
  extends LitElement
  implements HassDialog<EnergySettingsGasDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EnergySettingsGasDialogParams;

  @state() private _open = false;

  @state() private _source?: GasSourceTypeEnergyPreference;

  @state() private _costs?: "no-costs" | "number" | "entity" | "statistic";

  @state() private _pickedDisplayUnit?: string | null;

  @state() private _energy_units?: string[];

  @state() private _gas_units?: string[];

  @state() private _flow_rate_units?: string[];

  @state() private _error?: string;

  private _excludeList?: string[];

  private _excludeListFlowRate?: string[];

  public async showDialog(
    params: EnergySettingsGasDialogParams
  ): Promise<void> {
    this._params = params;
    this._source = params.source
      ? { ...params.source }
      : emptyGasEnergyPreference();
    this._pickedDisplayUnit = getDisplayUnit(
      this.hass,
      params.source?.stat_energy_from,
      params.metadata
    );
    this._costs = this._source.entity_energy_price
      ? "entity"
      : this._source.number_energy_price
        ? "number"
        : this._source.stat_cost
          ? "statistic"
          : "no-costs";
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

    const unitPrice = this._pickedDisplayUnit
      ? `${this.hass.config.currency}/${this._pickedDisplayUnit}`
      : undefined;

    const pickedUnitClass =
      this._pickedDisplayUnit &&
      this._energy_units?.includes(this._pickedDisplayUnit)
        ? "energy"
        : this._pickedDisplayUnit &&
            this._gas_units?.includes(this._pickedDisplayUnit)
          ? "volume"
          : undefined;

    const externalSource =
      this._source.stat_energy_from &&
      isExternalStatistic(this._source.stat_energy_from);

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.energy.gas.dialog.header"
        )}
        prevent-scrim-close
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
          .hass=${this.hass}
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          .includeUnitClass=${this._params.allowedGasUnitClass ||
          gasUnitClasses}
          .includeDeviceClass=${gasDeviceClasses}
          .value=${this._source.stat_energy_from}
          .label=${this.hass.localize(
            "ui.panel.config.energy.gas.dialog.gas_usage"
          )}
          .excludeStatistics=${this._excludeList}
          @value-changed=${this._statisticChanged}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.gas.dialog.entity_para",
            { unit: pickableUnit }
          )}
          autofocus
        ></ha-statistic-picker>

        <ha-statistic-picker
          .hass=${this.hass}
          .includeUnitClass=${flowRateUnitClasses}
          .value=${this._source.stat_rate}
          .label=${this.hass.localize(
            "ui.panel.config.energy.gas.dialog.gas_flow_rate"
          )}
          .excludeStatistics=${this._excludeListFlowRate}
          @value-changed=${this._flowRateStatisticChanged}
          .helper=${this.hass.localize(
            "ui.panel.config.energy.gas.dialog.flow_rate_para",
            { unit: this._flow_rate_units?.join(", ") || "" }
          )}
        ></ha-statistic-picker>

        <ha-input
          .label=${this.hass.localize(
            "ui.panel.config.energy.water.dialog.display_name"
          )}
          type="text"
          .disabled=${!(
            this._source?.stat_energy_from || this._source?.stat_rate
          )}
          .value=${this._source?.name || ""}
          @input=${this._nameChanged}
        >
        </ha-input>

        <ha-radio-group
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
        ${this._costs === "statistic"
          ? html`<ha-statistic-picker
              class="price-options"
              .hass=${this.hass}
              statistic-types="sum"
              .value=${this._source.stat_cost}
              .label=${`${this.hass.localize(
                "ui.panel.config.energy.gas.dialog.cost_stat_input"
              )} (${this.hass.config.currency})`}
              @value-changed=${this._priceStatChanged}
            ></ha-statistic-picker>`
          : this._costs === "entity"
            ? html`<ha-entity-picker
                class="price-options"
                .hass=${this.hass}
                include-domains='["sensor", "input_number"]'
                .value=${this._source.entity_energy_price}
                .label=${this.hass.localize(
                  "ui.panel.config.energy.gas.dialog.cost_entity_input"
                )}
                .helper=${pickedUnitClass
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
                  : nothing}
                @value-changed=${this._priceEntityChanged}
              ></ha-entity-picker>`
            : this._costs === "number"
              ? html`<ha-input
                  .label=${`${this.hass.localize(
                    "ui.panel.config.energy.gas.dialog.cost_number_input"
                  )} ${unitPrice ? ` (${unitPrice})` : ""}`}
                  class="price-options"
                  step="any"
                  type="number"
                  .value=${this._source.number_energy_price !== null
                    ? String(this._source.number_energy_price)
                    : ""}
                  @change=${this._numberPriceChanged}
                >
                  ${unitPrice
                    ? html`<span slot="end">${unitPrice}</span>`
                    : nothing}
                </ha-input>`
              : nothing}

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
            .disabled=${!this._source.stat_energy_from}
            slot="primaryAction"
          >
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _handleCostChanged(ev: Event) {
    this._costs = (ev.currentTarget as HaRadioGroup).value as
      | "no-costs"
      | "number"
      | "entity"
      | "statistic";
  }

  private _numberPriceChanged(ev: InputEvent) {
    this._source = {
      ...this._source!,
      number_energy_price: Number((ev.target as HTMLInputElement).value),
      entity_energy_price: null,
      stat_cost: null,
    };
  }

  private _priceStatChanged(ev: CustomEvent) {
    this._source = {
      ...this._source!,
      entity_energy_price: null,
      number_energy_price: null,
      stat_cost: ev.detail.value,
    };
  }

  private _priceEntityChanged(ev: CustomEvent) {
    this._source = {
      ...this._source!,
      entity_energy_price: ev.detail.value,
      number_energy_price: null,
      stat_cost: null,
    };
  }

  private _flowRateStatisticChanged(ev: ValueChangedEvent<string>) {
    this._source = {
      ...this._source!,
      stat_rate: ev.detail.value || undefined,
    };
  }

  private async _statisticChanged(ev: ValueChangedEvent<string>) {
    if (ev.detail.value) {
      const metadata = await getStatisticMetadata(this.hass, [ev.detail.value]);
      this._pickedDisplayUnit = getDisplayUnit(
        this.hass,
        ev.detail.value,
        metadata[0]
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
  }

  private _nameChanged(ev: InputEvent) {
    this._source = {
      ...this._source!,
      name: (ev.target as HaInput).value,
    };
    if (!this._source.name) {
      delete this._source.name;
    }
  }

  private async _save() {
    try {
      if (this._costs === "no-costs") {
        this._source!.entity_energy_price = null;
        this._source!.number_energy_price = null;
        this._source!.stat_cost = null;
      }
      await this._params!.saveCallback(this._source!);
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
    "dialog-energy-gas-settings": DialogEnergyGasSettings;
  }
}
