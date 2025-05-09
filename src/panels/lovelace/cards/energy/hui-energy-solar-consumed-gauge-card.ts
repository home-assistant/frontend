import { mdiInformation } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import "../../../../components/ha-card";
import "../../../../components/ha-gauge";
import "../../../../components/ha-svg-icon";
import type { EnergyData } from "../../../../data/energy";
import {
  calculateSolarConsumedGauge,
  getEnergyDataCollection,
  getSummedData,
} from "../../../../data/energy";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
import { severityMap } from "../hui-gauge-card";
import type { EnergySolarGaugeCardConfig } from "../types";
import { hasConfigChanged } from "../../common/has-changed";

const FORMAT_OPTIONS = {
  maximumFractionDigits: 0,
};

@customElement("hui-energy-solar-consumed-gauge-card")
class HuiEnergySolarGaugeCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EnergySolarGaugeCardConfig;

  @state() private _data?: EnergyData;

  protected hassSubscribeRequiredHostProps = ["_config"];

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      getEnergyDataCollection(this.hass!, {
        key: this._config?.collection_key,
      }).subscribe((data) => {
        this._data = data;
      }),
    ];
  }

  public getCardSize(): number {
    return 4;
  }

  public setConfig(config: EnergySolarGaugeCardConfig): void {
    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return (
      hasConfigChanged(this, changedProps) ||
      changedProps.size > 1 ||
      !changedProps.has("hass")
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

    const { summedData, compareSummedData: _ } = getSummedData(this._data);
    if (!("solar" in summedData.total)) {
      return nothing;
    }

    const productionReturnedToGrid = summedData.total.to_grid ?? null;

    let value: number | undefined;
    if (productionReturnedToGrid !== null) {
      const hasBattery = !!summedData.to_battery || !!summedData.from_battery;
      value = calculateSolarConsumedGauge(hasBattery, summedData);
    }

    return html`
      <ha-card>
        ${value !== undefined
          ? html`
              <ha-gauge
                min="0"
                max="100"
                .value=${value}
                label="%"
                .formatOptions=${FORMAT_OPTIONS}
                .locale=${this.hass.locale}
                style=${styleMap({
                  "--gauge-color": this._computeSeverity(value),
                })}
              ></ha-gauge>
              <ha-tooltip placement="left" hoist>
                <span slot="content">
                  ${this.hass.localize(
                    "ui.panel.lovelace.cards.energy.solar_consumed_gauge.card_indicates_solar_energy_used"
                  )}
                  <br /><br />
                  ${this.hass.localize(
                    "ui.panel.lovelace.cards.energy.solar_consumed_gauge.card_indicates_solar_energy_used_charge_home_bat"
                  )}
                </span>
                <ha-svg-icon .path=${mdiInformation}></ha-svg-icon>
              </ha-tooltip>
              <div class="name">
                ${this.hass.localize(
                  "ui.panel.lovelace.cards.energy.solar_consumed_gauge.self_consumed_solar_energy"
                )}
              </div>
            `
          : productionReturnedToGrid !== null
            ? this.hass.localize(
                "ui.panel.lovelace.cards.energy.solar_consumed_gauge.not_produced_solar_energy"
              )
            : this.hass.localize(
                "ui.panel.lovelace.cards.energy.solar_consumed_gauge.self_consumed_solar_could_not_calc"
              )}
      </ha-card>
    `;
  }

  private _computeSeverity(numberValue: number): string {
    if (numberValue > 75) {
      return severityMap.green;
    }
    if (numberValue < 50) {
      return severityMap.yellow;
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
      direction: ltr;
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
    "hui-energy-solar-consumed-gauge-card": HuiEnergySolarGaugeCard;
  }
}
