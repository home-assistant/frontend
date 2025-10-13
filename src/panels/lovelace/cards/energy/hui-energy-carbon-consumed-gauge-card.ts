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
  getEnergyDataCollection,
  getSummedData,
} from "../../../../data/energy";
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
      return html`<hui-warning .hass=${this.hass}>
        ${createEntityNotFoundWarning(this.hass, this._data.co2SignalEntity)}
      </hui-warning>`;
    }

    const { summedData, compareSummedData: _ } = getSummedData(this._data);

    const totalGridConsumption = summedData.total.from_grid ?? 0;

    let value: number | undefined;

    if (this._data.fossilEnergyConsumption) {
      const highCarbonEnergy = this._data.fossilEnergyConsumption
        ? Object.values(this._data.fossilEnergyConsumption).reduce(
            (sum, a) => sum + a,
            0
          )
        : 0;

      const totalSolarProduction = summedData.total.solar ?? 0;

      const totalGridReturned = summedData.total.to_grid ?? 0;

      const totalEnergyConsumed =
        totalGridConsumption +
        Math.max(0, totalSolarProduction - totalGridReturned);

      if (totalEnergyConsumed) {
        value = round((1 - highCarbonEnergy / totalEnergyConsumed) * 100);
      }
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

              <ha-svg-icon id="info" .path=${mdiInformation}></ha-svg-icon>
              <ha-tooltip for="info" placement="left">
                ${this.hass.localize(
                  "ui.panel.lovelace.cards.energy.carbon_consumed_gauge.card_indicates_energy_used"
                )}
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
      font-size: var(--ha-font-size-m);
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
