import "@material/mwc-button/mwc-button";
import { mdiTransmissionTower } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/entity/ha-statistic-picker";
import "../../../../components/ha-dialog";
import "../../../../components/ha-formfield";
import "../../../../components/ha-radio";
import type { HaRadio } from "../../../../components/ha-radio";
import {
  emptyFlowFromGridSourceEnergyPreference,
  emptyFlowToGridSourceEnergyPreference,
  FlowFromGridSourceEnergyPreference,
  FlowToGridSourceEnergyPreference,
  energyStatisticHelpUrl,
} from "../../../../data/energy";
import {
  getDisplayUnit,
  getStatisticMetadata,
  isExternalStatistic,
} from "../../../../data/recorder";
import { getSensorDeviceClassConvertibleUnits } from "../../../../data/sensor";
import { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { EnergySettingsGridFlowDialogParams } from "./show-dialogs-energy";

const energyUnitClasses = ["energy"];

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

  @state() private _pickedDisplayUnit?: string | null;

  @state() private _energy_units?: string[];

  @state() private _error?: string;

  private _excludeList?: string[];

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

    const initialSourceId =
      this._source[
        this._params.direction === "from"
          ? "stat_energy_from"
          : "stat_energy_to"
      ];

    this._pickedDisplayUnit = getDisplayUnit(
      this.hass,
      initialSourceId,
      params.metadata
    );
    this._energy_units = (
      await getSensorDeviceClassConvertibleUnits(this.hass, "energy")
    ).units;

    this._excludeList = [
      ...(this._params.grid_source?.flow_from?.map(
        (entry) => entry.stat_energy_from
      ) || []),
      ...(this._params.grid_source?.flow_to?.map(
        (entry) => entry.stat_energy_to
      ) || []),
    ].filter((id) => id !== initialSourceId);
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

    const pickableUnit = this._energy_units?.join(", ") || "";

    const unitPriceSensor = this._pickedDisplayUnit
      ? `${this.hass.config.currency}/${this._pickedDisplayUnit}`
      : undefined;

    const unitPriceFixed = `${this.hass.config.currency}/kWh`;

    const externalSource =
      this._source[
        this._params.direction === "from"
          ? "stat_energy_from"
          : "stat_energy_to"
      ] &&
      isExternalStatistic(
        this._source[
          this._params.direction === "from"
            ? "stat_energy_from"
            : "stat_energy_to"
        ]
      );

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
          <p>
            ${this.hass.localize(
              `ui.panel.config.energy.grid.flow_dialog.${this._params.direction}.paragraph`
            )}
          </p>
          <p>
            ${this.hass.localize(
              `ui.panel.config.energy.grid.flow_dialog.${this._params.direction}.entity_para`,
              { unit: pickableUnit }
            )}
          </p>
        </div>

        <ha-statistic-picker
          .hass=${this.hass}
          .helpMissingEntityUrl=${energyStatisticHelpUrl}
          .includeUnitClass=${energyUnitClasses}
          .value=${this._source[
            this._params.direction === "from"
              ? "stat_energy_from"
              : "stat_energy_to"
          ]}
          .label=${this.hass.localize(
            `ui.panel.config.energy.grid.flow_dialog.${this._params.direction}.energy_stat`
          )}
          .excludeStatistics=${this._excludeList}
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
              .label=${`${this.hass.localize(
                `ui.panel.config.energy.grid.flow_dialog.${this._params.direction}.cost_stat_input`
              )} (${this.hass.config.currency})`}
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
                `ui.panel.config.energy.grid.flow_dialog.${this._params.direction}.cost_entity_input`
              )} ${unitPriceSensor ? ` (${unitPriceSensor})` : ""}`}
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
            .disabled=${externalSource}
            @change=${this._handleCostChanged}
          ></ha-radio>
        </ha-formfield>
        ${this._costs === "number"
          ? html`<ha-textfield
              .label=${`${this.hass.localize(
                `ui.panel.config.energy.grid.flow_dialog.${this._params.direction}.cost_number_input`
              )} (${unitPriceFixed})`}
              class="price-options"
              step="any"
              type="number"
              .value=${this._source.number_energy_price}
              .suffix=${unitPriceFixed}
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
