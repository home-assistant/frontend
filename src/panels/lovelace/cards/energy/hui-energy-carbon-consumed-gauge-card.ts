import { mdiInformation } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { round } from "../../../../common/number/round";
import "../../../../components/ha-card";
import "../../../../components/ha-gauge";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-tooltip";
import type { EnergyData } from "../../../../data/energy";
import {
  energySourcesByType,
  getEnergyDataCollection,
} from "../../../../data/energy";
import { calculateStatisticsSumGrowth } from "../../../../data/recorder";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import { createEntityNotFoundWarning } from "../../components/hui-warning";
import type { LovelaceCard } from "../../types";
import { severityMap } from "../hui-gauge-card";
import type { EnergyCarbonGaugeCardConfig } from "../types";
import { hasConfigChanged } from "../../common/has-changed";

const FORMAT_OPTIONS = {
  maximumFractionDigits: 0,
};

@customElement("hui-energy-carbon-consumed-gauge-card")
class HuiEnergyCarbonGaugeCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyCarbonGaugeCardConfig;

  @state() private _data?: EnergyData;

  protected hassSubscribeRequiredHostProps = ["_config"];

  public getCardSize(): number {
    return 4;
  }

  public setConfig(config: EnergyCarbonGaugeCardConfig): void {
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

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return (
      hasConfigChanged(this, changedProps) ||
      changedProps.size > 1 ||
      !changedProps.has("hass") ||
      (!!this._data?.co2SignalEntity &&
        this.hass.states[this._data.co2SignalEntity] !==
          changedProps.get("hass").states[this._data.co2SignalEntity])
    );
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    if (!this._data) {
      return html`${this.hass.localize(
        "ui.panel.lovelace.cards.energy.loading"
      )}`;
    }

    if (!this._data.co2SignalEntity) {
      return nothing;
    }

    const co2State = this.hass.states[this._data.co2SignalEntity];

    if (!co2State) {
      return html`<hui-warning>
        ${createEntityNotFoundWarning(this.hass, this._data.co2SignalEntity)}
      </hui-warning>`;
    }

    const prefs = this._data.prefs;
    const types = energySourcesByType(prefs);

    const totalGridConsumption = calculateStatisticsSumGrowth(
      this._data.stats,
      types.grid![0].flow_from.map((flow) => flow.stat_energy_from)
    );

    let value: number | undefined;

    if (this._data.fossilEnergyConsumption && totalGridConsumption) {
      const highCarbonEnergy = this._data.fossilEnergyConsumption
        ? Object.values(this._data.fossilEnergyConsumption).reduce(
            (sum, a) => sum + a,
            0
          )
        : 0;

      const totalSolarProduction = types.solar
        ? calculateStatisticsSumGrowth(
            this._data.stats,
            types.solar.map((source) => source.stat_energy_from)
          ) || 0
        : 0;

      const totalGridReturned =
        calculateStatisticsSumGrowth(
          this._data.stats,
          types.grid![0].flow_to.map((flow) => flow.stat_energy_to)
        ) || 0;

      const totalEnergyConsumed =
        totalGridConsumption +
        Math.max(0, totalSolarProduction - totalGridReturned);

      value = round((1 - highCarbonEnergy / totalEnergyConsumed) * 100);
    }

    return html`
      <ha-card>
        ${value !== undefined
          ? html`
              <ha-gauge
                min="0"
                max="100"
                .value=${value}
                .formatOptions=${FORMAT_OPTIONS}
                .locale=${this.hass.locale}
                label="%"
                style=${styleMap({
                  "--gauge-color": this._computeSeverity(value),
                })}
              ></ha-gauge>
              <ha-tooltip
                .content=${this.hass.localize(
                  "ui.panel.lovelace.cards.energy.carbon_consumed_gauge.card_indicates_energy_used"
                )}
                placement="left"
                hoist
              >
                <ha-svg-icon .path=${mdiInformation}></ha-svg-icon>
              </ha-tooltip>
              <div class="name">
                ${this.hass.localize(
                  "ui.panel.lovelace.cards.energy.carbon_consumed_gauge.low_carbon_energy_consumed"
                )}
              </div>
            `
          : html`${this.hass.localize(
              "ui.panel.lovelace.cards.energy.carbon_consumed_gauge.low_carbon_energy_not_calculated"
            )}`}
      </ha-card>
    `;
  }

  private _computeSeverity(numberValue: number): string {
    if (numberValue < 10) {
      return severityMap.red;
    }
    if (numberValue < 30) {
      return severityMap.yellow;
    }
    if (numberValue > 75) {
      return severityMap.green;
    }
    return severityMap.normal;
  }

  static styles = css`
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
      inset-inline-end: 4px;
      inset-inline-start: initial;
      top: 4px;
      color: var(--secondary-text-color);
    }

    ha-tooltip::part(base__popup) {
      margin-top: 4px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-carbon-consumed-gauge-card": HuiEnergyCarbonGaugeCard;
  }
}
