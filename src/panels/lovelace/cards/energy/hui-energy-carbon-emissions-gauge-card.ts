import { mdiInformation } from "@mdi/js";
import "@polymer/paper-tooltip";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
// import { styleMap } from "lit/directives/style-map";
// import { round } from "../../../../common/number/round";
import { formatNumber } from "../../../../common/number/format_number";

import "../../../../components/ha-card";
import "../../../../components/ha-gauge";
import "../../../../components/ha-svg-icon";
import {
  EnergyData,
  // energySourcesByType,
  getEnergyDataCollection,
} from "../../../../data/energy";
// import { calculateStatisticsSumGrowth } from "../../../../data/history";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import { createEntityNotFoundWarning } from "../../components/hui-warning";
import type { LovelaceCard } from "../../types";
// import { severityMap } from "../hui-gauge-card";
import type { EnergyCarbonEmissionsGaugeCardConfig } from "../types";

const LEVELS: LevelDefinition[] = [
  { level: -1, stroke: "var(--energy-carbon-avoided-electrical-color)" },
  { level: 0, stroke: "var(--energy-carbon-offsets-electrical-color)" },
  { level: 1, stroke: "var(--energy-carbon-emissions-electrical-color)" },
];

@customElement("hui-energy-carbon-emissions-gauge-card")
class HuiEnergyCarbonEmissionsGaugeCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyCarbonEmissionsGaugeCardConfig;

  @state() private _data?: EnergyData;

  protected hassSubscribeRequiredHostProps = ["_config"];

  public getCardSize(): number {
    return 4;
  }

  public setConfig(config: EnergyCarbonEmissionsGaugeCardConfig): void {
    this._config = config;
  }

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      getEnergyDataCollection(this.hass, {
        key: this._config?.collection_key,
      }).subscribe((data) => {
        this._data = data;
      }),
    ];
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    if (!this._data) {
      return html`${this.hass.localize(
        "ui.panel.lovelace.cards.energy.loading"
      )}`;
    }

    if (!this._data.co2SignalEntity) {
      return html``;
    }

    const co2State = this.hass.states[this._data.co2SignalEntity];

    if (!co2State) {
      return html`<hui-warning>
        ${createEntityNotFoundWarning(this.hass, this._data.co2SignalEntity)}
      </hui-warning>`;
    }

    let netEmissions = 0;
    let absoluteEmissions = 0;

    const electricityEmissions = this._data.emissions.carbonDioxideEquivalentElectricityEmissions
    ? Object.values(this._data.emissions.carbonDioxideEquivalentElectricityEmissions).reduce(
        (sum, a) => sum + a,
        0
      )
    : 0;

    const electricityAvoided = this._data.emissions.carbonDioxideEquivalentElectricityAvoided
    ? Object.values(this._data.emissions.carbonDioxideEquivalentElectricityAvoided).reduce(
        (sum, a) => sum + a,
        0
      )
    : 0;

    const electricityOffsets = this._data.emissions.carbonDioxideEquivalentElectricityOffsets
    ? Object.values(this._data.emissions.carbonDioxideEquivalentElectricityOffsets).reduce(
        (sum, a) => sum + a,
        0
      )
    : 0;

    const gasEmissions = this._data.emissions.carbonDioxideEquivalentGasEmissions
    ? Object.values(this._data.emissions.carbonDioxideEquivalentGasEmissions).reduce(
        (sum, a) => sum + a,
        0
      )
    : 0;

    const gasOffsets = this._data.emissions.carbonDioxideEquivalentGasOffsets
    ? Object.values(this._data.emissions.carbonDioxideEquivalentGasOffsets).reduce(
        (sum, a) => sum + a,
        0
      )
    : 0;


    netEmissions += electricityEmissions;
    absoluteEmissions += electricityEmissions;
    netEmissions +=  electricityOffsets;
    netEmissions +=  electricityAvoided;

    netEmissions += gasEmissions;
    absoluteEmissions += gasEmissions;
    netEmissions +=  gasOffsets;
  
  let value = 0;
  if( netEmissions > 0 ){
    value = 1;
  }
  else if(netEmissions < 0){
    value = -1;
  }

    return html`
      <ha-card>
        ${value !== undefined
          ? html`
              <ha-svg-icon id="info" .path=${mdiInformation}></ha-svg-icon>
              <paper-tooltip animation-delay="0" for="info" position="left">
                <span>
                  ${this.hass.localize(
                    "ui.panel.lovelace.cards.energy.carbon_emissions_gauge.card_indicates_energy_used"
                  )}
                </span>
              </paper-tooltip>
              <ha-gauge
                min="-1"
                max="1"
                .value=${value}
                .valueText=${formatNumber(
                  netEmissions,
                  this.hass.locale,
                  { maximumFractionDigits: 2 }
                )}
                .locale=${this.hass!.locale}
                .levels=${LEVELS}
                label="kgCO2Eq"
                needle
              ></ha-gauge>
              <div class="name">
                ${this.hass.localize(
                  "ui.panel.lovelace.cards.energy.carbon_emissions_gauge.co2eq_emissions"
                )}
              </div>
            `
          : html`${this.hass.localize(
              "ui.panel.lovelace.cards.energy.carbon_emissions_gauge.co2eq_emissions_not_calculated"
            )}`}
      </ha-card>
    `;
  }

 

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        height: 100%;
        overflow: hidden;
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        box-sizing: border-box;
      }

      ha-gauge {
        width: 100%;
        max-width: 250px;
      }

      .name {
        text-align: center;
        line-height: initial;
        color: var(--primary-text-color);
        width: 100%;
        font-size: 15px;
        margin-top: 8px;
      }

      ha-svg-icon {
        position: absolute;
        right: 4px;
        top: 4px;
        color: var(--secondary-text-color);
      }
      paper-tooltip > span {
        font-size: 12px;
        line-height: 12px;
      }
      paper-tooltip {
        width: 80%;
        max-width: 250px;
        top: 8px !important;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-carbon-emissions-gauge-card": HuiEnergyCarbonEmissionsGaugeCard;
  }
}
