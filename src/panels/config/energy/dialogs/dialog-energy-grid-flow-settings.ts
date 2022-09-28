import { mdiTransmissionTower } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-dialog";
import {
  emptyFlowFromGridSourceEnergyPreference,
  emptyFlowToGridSourceEnergyPreference,
  FlowFromGridSourceEnergyPreference,
  FlowToGridSourceEnergyPreference,
} from "../../../../data/energy";
import { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { EnergySettingsGridFlowDialogParams } from "./show-dialogs-energy";
import "@material/mwc-button/mwc-button";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-radio";
import "../../../../components/ha-formfield";
import type { HaRadio } from "../../../../components/ha-radio";
import "../../../../components/entity/ha-entity-picker";

const energyUnits = ["kWh"];
const energyDeviceClasses = ["energy"];

@customElement("dialog-energy-grid-flow-settings")
export class DialogEnergyGridFlowSettings
  extends LitElement
  implements HassDialog<EnergySettingsGridFlowDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EnergySettingsGridFlowDialogParams;

  @state() private _source?:
    | FlowFromGridSourceEnergyPreference
    | FlowToGridSourceEnergyPreference;

  @state() private _costs?: "no-costs" | "number" | "entity" | "statistic";

  @state() private _error?: string;

  public async showDialog(
    params: EnergySettingsGridFlowDialogParams
  ): Promise<void> {
    this._params = params;
    this._source = params.source
      ? { ...params.source }
      : params.direction === "from"
      ? emptyFlowFromGridSourceEnergyPreference()
      : emptyFlowToGridSourceEnergyPreference();
    this._costs = this._source.entity_energy_price
      ? "entity"
      : this._source.number_energy_price
      ? "number"
      : this._source[
          params.direction === "from" ? "stat_cost" : "stat_compensation"
        ]
      ? "statistic"
      : "no-costs";
  }

  public closeDialog(): void {
    this._params = undefined;
    this._source = undefined;
    this._error = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params || !this._source) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        .heading=${html`<ha-svg-icon
            .path=${mdiTransmissionTower}
            style="--mdc-icon-size: 32px;"
          ></ha-svg-icon
          >${this.hass.localize(
            `ui.panel.config.energy.grid.flow_dialog.${this._params.direction}.header`
          )}`}
        @closed=${this.closeDialog}
      >
        ${this._error ? html`<p class="error">${this._error}</p>` : ""}
        <div>
          ${this.hass.localize(
            `ui.panel.config.energy.grid.flow_dialog.${this._params.direction}.paragraph`
          )}
        </div>

        <ha-statistic-picker
          .hass=${this.hass}
          .includeStatisticsUnitOfMeasurement=${energyUnits}
          .includeDeviceClasses=${energyDeviceClasses}
          .value=${this._source[
            this._params.direction === "from"
              ? "stat_energy_from"
              : "stat_energy_to"
          ]}
          .label=${this.hass.localize(
            `ui.panel.config.energy.grid.flow_dialog.${this._params.direction}.energy_stat`
          )}
          @value-changed=${this._statisticChanged}
          dialogInitialFocus
        ></ha-statistic-picker>

        <p>
          ${this.hass.localize(
            `ui.panel.config.energy.grid.flow_dialog.${this._params.direction}.cost_para`
          )}
        </p>

        <ha-formfield
          .label=${this.hass.localize(
            `ui.panel.config.energy.grid.flow_dialog.${this._params.direction}.no_cost`
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
            `ui.panel.config.energy.grid.flow_dialog.${this._params.direction}.cost_stat`
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
              .value=${this._source[
                this._params!.direction === "from"
                  ? "stat_cost"
                  : "stat_compensation"
              ]}
              .label=${this.hass.localize(
                `ui.panel.config.energy.grid.flow_dialog.${this._params.direction}.cost_stat_input`
              )}
              @value-changed=${this._priceStatChanged}
            ></ha-statistic-picker>`
          : ""}
        <ha-formfield
          .label=${this.hass.localize(
            `ui.panel.config.energy.grid.flow_dialog.${this._params.direction}.cost_entity`
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
                `ui.panel.config.energy.grid.flow_dialog.${this._params.direction}.cost_entity_input`
              )}
              @value-changed=${this._priceEntityChanged}
            ></ha-entity-picker>`
          : ""}
        <ha-formfield
          .label=${this.hass.localize(
            `ui.panel.config.energy.grid.flow_dialog.${this._params.direction}.cost_number`
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
          ? html`<ha-textfield
              .label=${this.hass.localize(
                `ui.panel.config.energy.grid.flow_dialog.${this._params.direction}.cost_number_input`
              )}
              class="price-options"
              step=".01"
              type="number"
              .value=${this._source.number_energy_price}
              .suffix=${this.hass.localize(
                `ui.panel.config.energy.grid.flow_dialog.${this._params.direction}.cost_number_suffix`,
                { currency: this.hass.config.currency }
              )}
              @change=${this._numberPriceChanged}
            >
            </ha-textfield>`
          : ""}

        <mwc-button @click=${this.closeDialog} slot="secondaryAction">
          ${this.hass.localize("ui.common.cancel")}
        </mwc-button>
        <mwc-button
          @click=${this._save}
          .disabled=${!this._source[
            this._params!.direction === "from"
              ? "stat_energy_from"
              : "stat_energy_to"
          ]}
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

  private set _costStat(value: null | string) {
    this._source![
      this._params!.direction === "from" ? "stat_cost" : "stat_compensation"
    ] = value;
  }

  private _numberPriceChanged(ev: CustomEvent) {
    this._costStat = null;
    this._source = {
      ...this._source!,
      number_energy_price: Number((ev.target as any).value),
      entity_energy_price: null,
    };
  }

  private _priceStatChanged(ev: CustomEvent) {
    this._costStat = ev.detail.value;
    this._source = {
      ...this._source!,
      entity_energy_price: null,
      number_energy_price: null,
    };
  }

  private _priceEntityChanged(ev: CustomEvent) {
    this._costStat = null;
    this._source = {
      ...this._source!,
      entity_energy_price: ev.detail.value,
      number_energy_price: null,
    };
  }

  private _statisticChanged(ev: CustomEvent<{ value: string }>) {
    this._source = {
      ...this._source!,
      [this._params!.direction === "from"
        ? "stat_energy_from"
        : "stat_energy_to"]: ev.detail.value,
    };
  }

  private async _save() {
    try {
      if (this._costs === "no-costs") {
        this._source!.entity_energy_price = null;
        this._source!.number_energy_price = null;
        this._costStat = null;
      }
      await this._params!.saveCallback(this._source!);
      this.closeDialog();
    } catch (err: any) {
      this._error = err.message;
    }
  }

  static get styles(): CSSResultGroup {
    return [
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
    "dialog-energy-grid-flow-settings": DialogEnergyGridFlowSettings;
  }
}
