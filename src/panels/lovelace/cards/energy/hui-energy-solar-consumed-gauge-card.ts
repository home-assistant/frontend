import { mdiInformation } from "@mdi/js";
import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import "../../../../components/ha-card";
import "../../../../components/ha-gauge";
import "../../../../components/ha-svg-icon";
import {
  EnergyData,
  energySourcesByType,
  getEnergyDataCollection,
} from "../../../../data/energy";
import { calculateStatisticsSumGrowth } from "../../../../data/recorder";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
import { severityMap } from "../hui-gauge-card";
import type { EnergySolarGaugeCardConfig } from "../types";

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

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    if (!this._data) {
      return html`${this.hass.localize(
        "ui.panel.lovelace.cards.energy.loading"
      )}`;
    }

    const prefs = this._data.prefs;
    const types = energySourcesByType(prefs);

    if (!types.solar) {
      return nothing;
    }

    const totalSolarProduction =
      calculateStatisticsSumGrowth(
        this._data.stats,
        types.solar.map((source) => source.stat_energy_from)
      ) || 0;

    const productionReturnedToGrid = calculateStatisticsSumGrowth(
      this._data.stats,
      types.grid![0].flow_to.map((flow) => flow.stat_energy_to)
    );

    let value: number | undefined;

    if (productionReturnedToGrid !== null && totalSolarProduction) {
      const consumedSolar = Math.max(
        0,
        totalSolarProduction - productionReturnedToGrid
      );
      value = (consumedSolar / totalSolarProduction) * 100;
    }

    return html`
      <ha-card>
        ${value !== undefined
          ? html`
              <ha-svg-icon id="info" .path=${mdiInformation}></ha-svg-icon>
              <simple-tooltip animation-delay="0" for="info" position="left">
                <span>
                  ${this.hass.localize(
                    "ui.panel.lovelace.cards.energy.solar_consumed_gauge.card_indicates_solar_energy_used"
                  )}
                  <br /><br />
                  ${this.hass.localize(
                    "ui.panel.lovelace.cards.energy.solar_consumed_gauge.card_indicates_solar_energy_used_charge_home_bat"
                  )}
                </span>
              </simple-tooltip>
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
              <div class="name">
                ${this.hass.localize(
                  "ui.panel.lovelace.cards.energy.solar_consumed_gauge.self_consumed_solar_energy"
                )}
              </div>
            `
          : totalSolarProduction === 0
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
        direction: ltr;
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
      simple-tooltip > span {
        font-size: 12px;
        line-height: 12px;
      }
      simple-tooltip {
        width: 80%;
        max-width: 250px;
        top: 8px !important;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-solar-consumed-gauge-card": HuiEnergySolarGaugeCard;
  }
}
