import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { round } from "../../../../common/number/round";
import { subscribeOne } from "../../../../common/util/subscribe-one";
import "../../../../components/ha-card";
import "../../../../components/ha-gauge";
import { getConfigEntries } from "../../../../data/config_entries";
import {
  EnergyPreferences,
  energySourcesByType,
  getEnergyPreferences,
} from "../../../../data/energy";
import { subscribeEntityRegistry } from "../../../../data/entity_registry";
import {
  calculateStatisticsSumGrowth,
  calculateStatisticsSumGrowthWithPercentage,
  fetchStatistics,
  Statistics,
} from "../../../../data/history";
import type { HomeAssistant } from "../../../../types";
import { createEntityNotFoundWarning } from "../../components/hui-warning";
import type { LovelaceCard } from "../../types";
import { severityMap } from "../hui-gauge-card";
import type { EnergyCarbonGaugeCardConfig } from "../types";

@customElement("hui-energy-carbon-consumed-gauge-card")
class HuiEnergyCarbonGaugeCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyCarbonGaugeCardConfig;

  @state() private _stats?: Statistics;

  @state() private _co2SignalEntity?: string | null;

  private _prefs?: EnergyPreferences;

  public getCardSize(): number {
    return 4;
  }

  public setConfig(config: EnergyCarbonGaugeCardConfig): void {
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

    if (this._co2SignalEntity === null) {
      return html``;
    }

    if (!this._stats || !this._co2SignalEntity) {
      return html`Loading...`;
    }

    const co2State = this.hass.states[this._co2SignalEntity];

    if (!co2State) {
      return html`<hui-warning>
        ${createEntityNotFoundWarning(this.hass, this._co2SignalEntity)}
      </hui-warning>`;
    }

    const prefs = this._prefs!;
    const types = energySourcesByType(prefs);

    const totalGridConsumption = calculateStatisticsSumGrowth(
      this._stats,
      types.grid![0].flow_from.map((flow) => flow.stat_energy_from)
    );

    let value: number | undefined;

    if (this._co2SignalEntity in this._stats && totalGridConsumption) {
      const highCarbonEnergy =
        calculateStatisticsSumGrowthWithPercentage(
          this._stats[this._co2SignalEntity],
          types
            .grid![0].flow_from.map(
              (flow) => this._stats![flow.stat_energy_from]
            )
            .filter(Boolean)
        ) || 0;

      const totalSolarProduction = types.solar
        ? calculateStatisticsSumGrowth(
            this._stats,
            types.solar.map((source) => source.stat_energy_from)
          )
        : undefined;

      const totalGridReturned = calculateStatisticsSumGrowth(
        this._stats,
        types.grid![0].flow_to.map((flow) => flow.stat_energy_to)
      );

      const totalEnergyConsumed =
        totalGridConsumption +
        Math.max(0, (totalSolarProduction || 0) - (totalGridReturned || 0));

      value = round((1 - highCarbonEnergy / totalEnergyConsumed) * 100);
    }

    return html`
      <ha-card
        >${value !== undefined
          ? html` <ha-gauge
                min="0"
                max="100"
                .value=${value}
                .locale=${this.hass!.locale}
                label="%"
                style=${styleMap({
                  "--gauge-color": this._computeSeverity(value),
                })}
              ></ha-gauge>
              <div class="name">Non-fossil energy consumed</div>`
          : html`Consumed non-fossil energy couldn't be calculated`}
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

  private async _fetchCO2SignalEntity() {
    const [configEntries, entityRegistryEntries] = await Promise.all([
      getConfigEntries(this.hass),
      subscribeOne(this.hass.connection, subscribeEntityRegistry),
    ]);

    const co2ConfigEntry = configEntries.find(
      (entry) => entry.domain === "co2signal"
    );

    if (!co2ConfigEntry) {
      this._co2SignalEntity = null;
      return;
    }

    for (const entry of entityRegistryEntries) {
      if (entry.config_entry_id !== co2ConfigEntry.entry_id) {
        continue;
      }

      // The integration offers 2 entities. We want the % one.
      const co2State = this.hass.states[entry.entity_id];
      if (!co2State || co2State.attributes.unit_of_measurement !== "%") {
        continue;
      }

      this._co2SignalEntity = co2State.entity_id;
      return;
    }
    this._co2SignalEntity = null;
  }

  private async _getStatistics(): Promise<void> {
    await this._fetchCO2SignalEntity();

    if (this._co2SignalEntity === null) {
      return;
    }

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setTime(startDate.getTime() - 1000 * 60 * 60); // subtract 1 hour to get a startpoint

    const statistics: string[] = [];
    let prefs = this._config!.prefs;

    if (!prefs) {
      try {
        prefs = this._prefs = await getEnergyPreferences(this.hass);
      } catch (e) {
        return;
      }
    }

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

    if (this._co2SignalEntity) {
      statistics.push(this._co2SignalEntity);
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
    "hui-energy-carbon-consumed-gauge-card": HuiEnergyCarbonGaugeCard;
  }
}
