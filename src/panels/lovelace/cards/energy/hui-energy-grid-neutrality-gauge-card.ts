import { mdiInformation } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { formatNumber } from "../../../../common/number/format_number";
import "../../../../components/ha-card";
import "../../../../components/ha-gauge";
import type { LevelDefinition } from "../../../../components/ha-gauge";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-tooltip";
import type {
  EnergyData,
  GridSourceTypeEnergyPreference,
} from "../../../../data/energy";
import { getEnergyDataCollection } from "../../../../data/energy";
import { calculateStatisticsSumGrowth } from "../../../../data/recorder";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard } from "../../types";
import type { EnergyGridNeutralityGaugeCardConfig } from "../types";
import { hasConfigChanged } from "../../common/has-changed";

const LEVELS: LevelDefinition[] = [
  { level: -1, stroke: "var(--energy-grid-consumption-color)" },
  { level: 0, stroke: "var(--energy-grid-return-color)" },
];

@customElement("hui-energy-grid-neutrality-gauge-card")
class HuiEnergyGridGaugeCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyGridNeutralityGaugeCardConfig;

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

  public setConfig(config: EnergyGridNeutralityGaugeCardConfig): void {
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

    const prefs = this._data.prefs;
    const gridSource = prefs.energy_sources.find(
      (src) => src.type === "grid"
    ) as GridSourceTypeEnergyPreference | undefined;

    let value: number | undefined;

    if (!gridSource) {
      return nothing;
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
          ? html`
              <ha-gauge
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
              <ha-tooltip placement="left" hoist>
                <span slot="content">
                  ${this.hass.localize(
                    "ui.panel.lovelace.cards.energy.grid_neutrality_gauge.energy_dependency"
                  )}
                  <br /><br />
                  ${this.hass.localize(
                    "ui.panel.lovelace.cards.energy.grid_neutrality_gauge.color_explain"
                  )}
                </span>
                <ha-svg-icon .path=${mdiInformation}></ha-svg-icon>
              </ha-tooltip>
              <div class="name">
                ${returnedToGrid! >= consumedFromGrid!
                  ? this.hass.localize(
                      "ui.panel.lovelace.cards.energy.grid_neutrality_gauge.net_returned_grid"
                    )
                  : this.hass.localize(
                      "ui.panel.lovelace.cards.energy.grid_neutrality_gauge.net_consumed_grid"
                    )}
              </div>
            `
          : this.hass.localize(
              "ui.panel.lovelace.cards.energy.grid_neutrality_gauge.grid_neutrality_not_calculated"
            )}
      </ha-card>
    `;
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
    "hui-energy-grid-neutrality-gauge-card": HuiEnergyGridGaugeCard;
  }
}
