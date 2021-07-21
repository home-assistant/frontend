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

  @state() private _costs?: "no-costs" | "number" | "entity";

  @state() private _error?: string;

  public async showDialog(
    params: EnergySettingsGridFlowDialogParams
  ): Promise<void> {
    this._params = params;
    this._source = params.source
      ? { ...params.source }
      : (this._source =
          params.direction === "from"
            ? emptyFlowFromGridSourceEnergyPreference()
            : emptyFlowToGridSourceEnergyPreference());
    this._costs = this._source.entity_energy_price
      ? "entity"
      : this._source.number_energy_price
      ? "number"
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
    // .statisticIds=${this._statisticIds}

    return html`
      <ha-dialog
        open
        .heading=${html`<ha-svg-icon
            .path=${mdiTransmissionTower}
            style="--mdc-icon-size: 32px;"
          ></ha-svg-icon
          >${this.hass.localize(
            "ui.panel.config.energy.dialogs.grid.from.header"
          )}`}
        @closed=${this.closeDialog}
      >
        ${this._error ? html`<p class="error">${this._error}</p>` : ""}
        <p>
          Grid consumption is the energy that flows from the energy grid to your
          home. <a href="#">Learn more</a>
        </p>

        <ha-statistic-picker
          .hass=${this.hass}
          .includeUnitOfMeasurement=${energyUnits}
          .value=${this._source[
            this._params.direction === "from"
              ? "stat_energy_from"
              : "stat_energy_to"
          ]}
          .label=${`Consumed Energy (kWh)`}
          entities-only
          @value-changed=${this._statisticChanged}
        ></ha-statistic-picker>

        <p>
          Select how Home Assistant should keep track of the costs of the
          consumed energy.
        </p>

        <ha-formfield label="Do not track costs">
          <ha-radio
            value="no-costs"
            name="costs"
            .checked=${this._costs === "no-costs"}
            @change=${this._handleCostChanged}
          ></ha-radio>
        </ha-formfield>
        <ha-formfield label="Calculate costs">
          <ha-radio
            value="number"
            name="costs"
            .checked=${this._costs === "number"}
            @change=${this._handleCostChanged}
          ></ha-radio>
        </ha-formfield>
        ${this._costs === "number"
          ? html`<paper-input
              no-label-float
              class="price-options"
              step=".01"
              type="number"
              .value=${this._source.number_energy_price}
              @value-changed=${this._numberPriceChanged}
              ><span slot="suffix">€/kWh</span></paper-input
            >`
          : ""}
        <ha-formfield label="Use entity">
          <ha-radio
            value="entity"
            name="costs"
            label="Energy tariff"
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
              .label=${`Total cost or current price entity`}
              @value-changed=${this._priceEntityChanged}
            ></ha-entity-picker>`
          : ""}

        <mwc-button @click=${this.closeDialog} slot="secondaryAction">
          ${this.hass.localize("ui.common.cancel")}
        </mwc-button>
        <mwc-button @click=${this._save} slot="primaryAction">
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
    this._source!.entity_energy_price = null;
    this._source!.number_energy_price = Number(ev.detail.value);
  }

  private _priceEntityChanged(ev: CustomEvent) {
    this._source!.entity_energy_price = ev.detail.value;
    this._source!.number_energy_price = null;
  }

  private _statisticChanged(ev: CustomEvent<{ value: string }>) {
    this._source![
      this._params!.direction === "from" ? "stat_energy_from" : "stat_energy_to"
    ] = ev.detail.value;
    this._source![
      this._params!.direction === "from"
        ? "entity_energy_from"
        : "entity_energy_to"
    ] = ev.detail.value;
  }

  private async _save() {
    try {
      if (this._costs === "no-costs") {
        this._source!.entity_energy_price = null;
        this._source!.number_energy_price = null;
      }
      await this._params!.saveCallback(this._source!);
      this.closeDialog();
    } catch (e) {
      this._error = e.message;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-formfield {
          display: block;
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
    "dialog-energy-grid-flow-settings": DialogEnergyGridFlowSettings;
  }
}
