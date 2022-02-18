import { mdiFire } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-dialog";
import {
  emptyGasEnergyPreference,
  ENERGY_GAS_ENERGY_UNITS,
  ENERGY_GAS_UNITS,
  ENERGY_GAS_VOLUME_UNITS,
  GasSourceTypeEnergyPreference,
} from "../../../../data/energy";
import { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { EnergySettingsGasDialogParams } from "./show-dialogs-energy";
import "@material/mwc-button/mwc-button";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/ha-radio";
import "../../../../components/ha-formfield";
import type { HaRadio } from "../../../../components/ha-radio";

@customElement("dialog-energy-gas-settings")
export class DialogEnergyGasSettings
  extends LitElement
  implements HassDialog<EnergySettingsGasDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EnergySettingsGasDialogParams;

  @state() private _source?: GasSourceTypeEnergyPreference;

  @state() private _costs?: "no-costs" | "number" | "entity" | "statistic";

  @state() private _unit?: string;

  @state() private _error?: string;

  public async showDialog(
    params: EnergySettingsGasDialogParams
  ): Promise<void> {
    this._params = params;
    this._source = params.source
      ? { ...params.source }
      : emptyGasEnergyPreference();
    this._costs = this._source.entity_energy_price
      ? "entity"
      : this._source.number_energy_price
      ? "number"
      : this._source.stat_cost
      ? "statistic"
      : "no-costs";
  }

  public closeDialog(): void {
    this._params = undefined;
    this._source = undefined;
    this._unit = undefined;
    this._error = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params || !this._source) {
      return html``;
    }

    const unit =
      this._unit ||
      (this._params.unit === undefined
        ? "m³ or kWh"
        : this._params.unit === "energy"
        ? "kWh"
        : "m³");

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

        <ha-statistic-picker
          .hass=${this.hass}
          .includeUnitOfMeasurement=${this._params.unit === undefined
            ? ENERGY_GAS_UNITS
            : this._params.unit === "energy"
            ? ENERGY_GAS_ENERGY_UNITS
            : ENERGY_GAS_VOLUME_UNITS}
          .value=${this._source.stat_energy_from}
          .label=${`${this.hass.localize(
            "ui.panel.config.energy.gas.dialog.gas_usage"
          )} (${
            this._params.unit === undefined
              ? this.hass.localize(
                  "ui.panel.config.energy.gas.dialog.m3_or_kWh"
                )
              : this._params.unit === "energy"
              ? "kWh"
              : "m³"
          })`}
          @value-changed=${this._statisticChanged}
          dialogInitialFocus
        ></ha-statistic-picker>

        <p>
          ${this.hass.localize(`ui.panel.config.energy.gas.dialog.cost_para`)}
        </p>

        <ha-formfield
          .label=${this.hass.localize(
            `ui.panel.config.energy.gas.dialog.no_cost`
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
            `ui.panel.config.energy.gas.dialog.cost_stat`
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
              .label=${this.hass.localize(
                `ui.panel.config.energy.gas.dialog.cost_stat_input`
              )}
              @value-changed=${this._priceStatChanged}
            ></ha-statistic-picker>`
          : ""}
        <ha-formfield
          .label=${this.hass.localize(
            `ui.panel.config.energy.gas.dialog.cost_entity`
          )}
        >
          <ha-radio
            value="entity"
            name="costs"
            .checked=${this._costs === "entity"}
            @change=${this._handleCostChanged}
          ></ha-radio>
        </ha-formfield>
        ${this._costs === "entity"
          ? html`<ha-entity-picker
              class="price-options"
              .hass=${this.hass}
              include-domains='["sensor", "input_number"]'
              .value=${this._source.entity_energy_price}
              .label=${this.hass.localize(
                `ui.panel.config.energy.gas.dialog.cost_entity_input`,
                { unit }
              )}
              @value-changed=${this._priceEntityChanged}
            ></ha-entity-picker>`
          : ""}
        <ha-formfield
          .label=${this.hass.localize(
            `ui.panel.config.energy.gas.dialog.cost_number`
          )}
        >
          <ha-radio
            value="number"
            name="costs"
            .checked=${this._costs === "number"}
            @change=${this._handleCostChanged}
          ></ha-radio>
        </ha-formfield>
        ${this._costs === "number"
          ? html`<paper-input
              .label=${this.hass.localize(
                `ui.panel.config.energy.gas.dialog.cost_number_input`,
                { unit }
              )}
              no-label-float
              class="price-options"
              step=".01"
              type="number"
              .value=${this._source.number_energy_price}
              @value-changed=${this._numberPriceChanged}
            >
              <span slot="suffix">${this.hass.config.currency}/${unit}</span>
            </paper-input>`
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

  private _numberPriceChanged(ev: CustomEvent) {
    this._source = {
      ...this._source!,
      number_energy_price: Number(ev.detail.value),
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

  private _statisticChanged(ev: CustomEvent<{ value: string }>) {
    if (ev.detail.value) {
      const entity = this.hass.states[ev.detail.value];
      if (entity?.attributes.unit_of_measurement) {
        // Wh is normalized to kWh by stats generation
        this._unit =
          entity.attributes.unit_of_measurement === "Wh"
            ? "kWh"
            : entity.attributes.unit_of_measurement;
      }
    } else {
      this._unit = undefined;
    }
    this._source = {
      ...this._source!,
      stat_energy_from: ev.detail.value,
      entity_energy_from: ev.detail.value,
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
        ha-statistic-picker {
          width: 100%;
        }
        .price-options {
          display: block;
          padding-left: 52px;
          margin-top: -16px;
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
