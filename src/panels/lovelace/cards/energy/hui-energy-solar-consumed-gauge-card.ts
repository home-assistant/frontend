import { mdiInformation } from "@mdi/js";
import "@polymer/paper-tooltip";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
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
import { calculateStatisticsSumGrowth } from "../../../../data/history";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
import { severityMap } from "../hui-gauge-card";
import type { EnergySolarGaugeCardConfig } from "../types";

@customElement("hui-energy-solar-consumed-gauge-card")
class HuiEnergySolarGaugeCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EnergySolarGaugeCardConfig;

  @state() private _data?: EnergyData;

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

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    if (!this._data) {
      return html`Loading...`;
    }

    const prefs = this._data.prefs;
    const types = energySourcesByType(prefs);

    if (!types.solar) {
      return html``;
    }

    const totalSolarProduction = calculateStatisticsSumGrowth(
      this._data.stats,
      types.solar.map((source) => source.stat_energy_from)
    );

    const productionReturnedToGrid = calculateStatisticsSumGrowth(
      this._data.stats,
      types.grid![0].flow_to.map((flow) => flow.stat_energy_to)
    );

    let value: number | undefined;

    if (productionReturnedToGrid !== null && totalSolarProduction) {
      const cosumedSolar = Math.max(
        0,
        totalSolarProduction - productionReturnedToGrid
      );
      value = (cosumedSolar / totalSolarProduction) * 100;
    }

    return html`
      <ha-card>
        ${value !== undefined
          ? html`
              <ha-svg-icon id="info" .path=${mdiInformation}></ha-svg-icon>
              <paper-tooltip animation-delay="0" for="info" position="left">
                <span>
                  This card represents how much of the solar energy was used by
                  your home and was not returned to the grid.
                  <br /><br />
                  If you frequently produce more than you consume, try to
                  conserve this energy by installing a battery or buying an
                  electric car to charge.
                </span>
              </paper-tooltip>
              <ha-gauge
                min="0"
                max="100"
                .value=${value}
                .locale=${this.hass!.locale}
                label="%"
                style=${styleMap({
                  "--gauge-color": this._computeSeverity(value),
                })}
              ></ha-gauge>
              <div class="name">Self consumed solar energy</div>
            `
          : totalSolarProduction === 0
          ? "You have not produced any solar energy"
          : "Self consumed solar energy couldn't be calculated"}
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
    "hui-energy-solar-consumed-gauge-card": HuiEnergySolarGaugeCard;
  }
}
