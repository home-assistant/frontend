import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { formatNumber } from "../../../../common/string/format_number";
import "../../../../components/ha-card";
import "../../../../components/ha-gauge";
import type { LevelDefinition } from "../../../../components/ha-gauge";
import {
  EnergyData,
  getEnergyData,
  GridSourceTypeEnergyPreference,
} from "../../../../data/energy";
import { calculateStatisticsSumGrowth } from "../../../../data/history";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
import type { EnergyGridGaugeCardConfig } from "../types";

const LEVELS: LevelDefinition[] = [
  { level: -1, stroke: "var(--label-badge-red)" },
  { level: -0.2, stroke: "var(--label-badge-yellow)" },
  { level: 0, stroke: "var(--label-badge-green)" },
];

@customElement("hui-energy-grid-neutrality-gauge-card")
class HuiEnergyGridGaugeCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EnergyGridGaugeCardConfig;

  @state() private _data?: EnergyData;

  private _fetching = false;

  public getCardSize(): number {
    return 4;
  }

  public setConfig(config: EnergyGridGaugeCardConfig): void {
    this._config = config;
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (!this._fetching && this._config && this.hass) {
      this._fetching = true;
      (this._config.energyDataPromise || getEnergyData(this.hass!)).then(
        (data) => {
          this._data = data;
        }
      );
    }
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    if (!this._data) {
      return html`Loading...`;
    }

    const prefs = this._data.prefs;
    const gridSource = prefs.energy_sources.find(
      (src) => src.type === "grid"
    ) as GridSourceTypeEnergyPreference | undefined;

    let value: number | undefined;

    if (!gridSource) {
      return html``;
    }

    const consumedFromGrid = calculateStatisticsSumGrowth(
      this._data.stats,
      gridSource.flow_from.map((flow) => flow.stat_energy_from)
    );

    const returnedToGrid = calculateStatisticsSumGrowth(
      this._data.stats,
      gridSource.flow_to.map((flow) => flow.stat_energy_to)
    );

    if (consumedFromGrid !== null && returnedToGrid !== null) {
      if (returnedToGrid > consumedFromGrid) {
        value = 1 - consumedFromGrid / returnedToGrid;
      } else if (returnedToGrid < consumedFromGrid) {
        value = (1 - returnedToGrid / consumedFromGrid) * -1;
      } else {
        value = 0;
      }
    }

    return html`
      <ha-card>
        ${value !== undefined
          ? html`<ha-gauge
                min="-1"
                max="1"
                .value=${value}
                .valueText=${formatNumber(
                  Math.abs(returnedToGrid! - consumedFromGrid!),
                  this.hass.locale,
                  { maximumFractionDigits: 2 }
                )}
                .locale=${this.hass!.locale}
                .levels=${LEVELS}
                label="kWh"
                needle
              ></ha-gauge>
              <div class="name">
                ${returnedToGrid! >= consumedFromGrid!
                  ? "Returned to the grid"
                  : "Consumed from the grid"}
              </div>`
          : "Grid neutrality could not be calculated"}
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-grid-neutrality-gauge-card": HuiEnergyGridGaugeCard;
  }
}
