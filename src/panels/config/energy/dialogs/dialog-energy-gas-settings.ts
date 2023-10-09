import "@material/mwc-button/mwc-button";
import { mdiFire } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-dialog";
import "../../../../components/ha-formfield";
import "../../../../components/ha-radio";
import type { HaRadio } from "../../../../components/ha-radio";
import "../../../../components/ha-textfield";
import {
  emptyGasEnergyPreference,
  GasSourceTypeEnergyPreference,
  energyStatisticHelpUrl,
} from "../../../../data/energy";
import {
  getDisplayUnit,
  getStatisticMetadata,
  isExternalStatistic,
} from "../../../../data/recorder";
import { getSensorDeviceClassConvertibleUnits } from "../../../../data/sensor";
import { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { EnergySettingsGasDialogParams } from "./show-dialogs-energy";

const gasDeviceClasses = ["gas", "energy"];
const gasUnitClasses = ["volume", "energy"];

@customElement("dialog-energy-gas-settings")
export class DialogEnergyGasSettings
  extends LitElement
  implements HassDialog<EnergySettingsGasDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EnergySettingsGasDialogParams;

  @state() private _source?: GasSourceTypeEnergyPreference;

  @state() private _costs?: "no-costs" | "number" | "entity" | "statistic";

  @state() private _pickedDisplayUnit?: string | null;

  @state() private _energy_units?: string[];

  @state() private _gas_units?: string[];

  @state() private _error?: string;

  private _excludeList?: string[];

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
    this._excludeList = this._params.gas_sources
      .map((entry) => entry.stat_energy_from)
      .filter((id) => id !== this._source?.stat_energy_from);
  }

  public closeDialog(): void {
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

    const pickableUnit =
      this._params.allowedGasUnitClass === undefined
        ? [...(this._gas_units || []), ...(this._energy_units || [])].join(", ")
        : this._params.allowedGasUnitClass === "energy"
        ? this._energy_units?.join(", ") || ""
        : this._gas_units?.join(", ") || "";

    const unitPrice = this._pickedDisplayUnit
      ? `${this.hass.config.currency}/${this._pickedDisplayUnit}`
      : undefined;

    const externalSource =
      this._source.stat_energy_from &&
      isExternalStatistic(this._source.stat_energy_from);

    return html`
      <ha-dialog
        open
        .heading=${html`<ha-svg-icon
            .path=${mdiFire}
            style="--mdc-icon-size: 32px;"
          ></ha-svg-icon>
          ${this.hass.localize("ui.panel.config.energy.gas.dialog.header")}`}
        @closed=${this.closeDialog}
      >
        ${this._error ? html`<p class="error">${this._error}</p>` : ""}
        <div>
          <p>
            ${this.hass.localize("ui.panel.config.energy.gas.dialog.paragraph")}
          </p>
          <p>
            ${this.hass.localize(
              "ui.panel.config.energy.gas.dialog.entity_para",
              { unit: pickableUnit }
            )}
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
          dialogInitialFocus
        ></ha-statistic-picker>

        <p>
          ${this.hass.localize("ui.panel.config.energy.gas.dialog.cost_para")}
        </p>

        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.energy.gas.dialog.no_cost"
          )}
        >
          <ha-radio
            value="no-costs"
            name="costs"
            .checked=${this._costs === "no-costs"}
            @change=${this._handleCostChanged}
          ></ha-radio>
        </ha-formfield>
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.energy.gas.dialog.cost_stat"
          )}
        >
          <ha-radio
            value="statistic"
            name="costs"
            .checked=${this._costs === "statistic"}
            @change=${this._handleCostChanged}
          ></ha-radio>
        </ha-formfield>
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
          : ""}
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.energy.gas.dialog.cost_entity"
          )}
        >
          <ha-radio
            value="entity"
            name="costs"
            .checked=${this._costs === "entity"}
            .disabled=${externalSource}
            @change=${this._handleCostChanged}
          ></ha-radio>
        </ha-formfield>
        ${this._costs === "entity"
          ? html`<ha-entity-picker
              class="price-options"
              .hass=${this.hass}
              include-domains='["sensor", "input_number"]'
              .value=${this._source.entity_energy_price}
              .label=${`${this.hass.localize(
                "ui.panel.config.energy.gas.dialog.cost_entity_input"
              )} ${unitPrice ? ` (${unitPrice})` : ""}`}
              @value-changed=${this._priceEntityChanged}
            ></ha-entity-picker>`
          : ""}
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.energy.gas.dialog.cost_number"
          )}
        >
          <ha-radio
            value="number"
            name="costs"
            .checked=${this._costs === "number"}
            .disabled=${externalSource}
            @change=${this._handleCostChanged}
          ></ha-radio>
        </ha-formfield>
        ${this._costs === "number"
          ? html`<ha-textfield
              .label=${`${this.hass.localize(
                "ui.panel.config.energy.gas.dialog.cost_number_input"
              )} ${unitPrice ? ` (${unitPrice})` : ""}`}
              class="price-options"
              step="any"
              type="number"
              .value=${this._source.number_energy_price}
              @change=${this._numberPriceChanged}
              .suffix=${unitPrice || ""}
            >
            </ha-textfield>`
          : ""}

        <mwc-button @click=${this.closeDialog} slot="secondaryAction">
          ${this.hass.localize("ui.common.cancel")}
        </mwc-button>
        <mwc-button
          @click=${this._save}
          .disabled=${!this._source.stat_energy_from}
          slot="primaryAction"
        >
          ${this.hass.localize("ui.common.save")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _handleCostChanged(ev: CustomEvent) {
    const input = ev.currentTarget as HaRadio;
    this._costs = input.value as any;
  }

  private _numberPriceChanged(ev) {
    this._source = {
      ...this._source!,
      number_energy_price: Number(ev.target.value),
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

  private async _statisticChanged(ev: CustomEvent<{ value: string }>) {
    if (ev.detail.value) {
      const metadata = await getStatisticMetadata(this.hass, [ev.detail.value]);
      this._pickedDisplayUnit = getDisplayUnit(
        this.hass,
        ev.detail.value,
        metadata[0]
      );
    } else {
      this._pickedDisplayUnit = undefined;
    }
    if (isExternalStatistic(ev.detail.value) && this._costs !== "statistic") {
      this._costs = "no-costs";
    }
    this._source = {
      ...this._source!,
      stat_energy_from: ev.detail.value,
    };
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
        ha-dialog {
          --mdc-dialog-max-width: 430px;
        }
        ha-formfield {
          display: block;
        }
        .price-options {
          display: block;
          padding-left: 52px;
          margin-top: -8px;
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
