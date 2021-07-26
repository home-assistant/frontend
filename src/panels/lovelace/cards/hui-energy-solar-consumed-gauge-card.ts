import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { round } from "../../../common/number/round";
import "../../../components/ha-card";
import "../../../components/ha-gauge";
import { energySourcesByType } from "../../../data/energy";
import {
  calculateStatisticsSumGrowth,
  fetchStatistics,
  Statistics,
} from "../../../data/history";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCard } from "../types";
import { severityMap } from "./hui-gauge-card";
import type { EnergySolarGaugeCardConfig } from "./types";

@customElement("hui-energy-solar-consumed-gauge-card")
class HuiEnergySolarGaugeCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EnergySolarGaugeCardConfig;

  @state() private _stats?: Statistics;

  public getCardSize(): number {
    return 4;
  }

  public setConfig(config: EnergySolarGaugeCardConfig): void {
    this._config = config;
  }

  public willUpdate(changedProps) {
    super.willUpdate(changedProps);

    if (!this.hasUpdated) {
      this._getStatistics();
    }
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    if (!this._stats) {
      return html`Loading...`;
    }

    const prefs = this._config!.prefs;
    const types = energySourcesByType(prefs);

    const totalSolarProduction = calculateStatisticsSumGrowth(
      this._stats,
      types.solar!.map((source) => source.stat_energy_from)
    );

    const productionReturnedToGrid = calculateStatisticsSumGrowth(
      this._stats,
      types.grid![0].flow_to.map((flow) => flow.stat_energy_to)
    );

    let value: number | undefined;

    if (productionReturnedToGrid !== null && totalSolarProduction !== null) {
      const cosumedSolar = totalSolarProduction - productionReturnedToGrid;
      value = round((cosumedSolar / totalSolarProduction) * 100);
    }
    return html`
      <ha-card>
        ${value !== undefined
          ? html`<ha-gauge
                min="0"
                max="100"
                .value=${value}
                .locale=${this.hass!.locale}
                label="%"
                style=${styleMap({
                  "--gauge-color": this._computeSeverity(64),
                })}
              ></ha-gauge>
              <div class="name">Self consumed solar energy</div>`
          : html`Self consumed solar energy couldn't be calculated`}
      </ha-card>
    `;
  }

  private _computeSeverity(numberValue: number): string {
    if (numberValue > 50) {
      return severityMap.green;
    }
    return severityMap.normal;
  }

  private async _getStatistics(): Promise<void> {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setTime(startDate.getTime() - 1000 * 60 * 60); // subtract 1 hour to get a startpoint

    const statistics: string[] = [];
    const prefs = this._config!.prefs;
    for (const source of prefs.energy_sources) {
      if (source.type === "solar") {
        statistics.push(source.stat_energy_from);
        continue;
      }

      // grid source
      for (const flowFrom of source.flow_from) {
        statistics.push(flowFrom.stat_energy_from);
      }
      for (const flowTo of source.flow_to) {
        statistics.push(flowTo.stat_energy_to);
      }
    }

    this._stats = await fetchStatistics(
      this.hass!,
      startDate,
      undefined,
      statistics
    );
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
        --gauge-color: var(--label-badge-blue);
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-solar-consumed-gauge-card": HuiEnergySolarGaugeCard;
  }
}
