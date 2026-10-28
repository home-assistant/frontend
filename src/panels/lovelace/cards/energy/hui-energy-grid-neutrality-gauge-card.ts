import { mdiInformationOutline } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import { formatNumber } from "../../../../common/number/format_number";
import "../../../../components/ha-card";
import "../../../../components/ha-gauge";
import type { LevelDefinition } from "../../../../components/ha-gauge";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-tooltip";
import { internationalizationContext } from "../../../../data/context";
import type { EnergyData } from "../../../../data/energy";
import {
  getSummedData,
  validateEnergyCollectionKey,
} from "../../../../data/energy";
import { EnergyCollectionController } from "../../../../data/energy-collection-controller";
import type {
  HomeAssistant,
  HomeAssistantInternationalization,
} from "../../../../types";
import type { LovelaceCard } from "../../types";
import type { EnergyGridNeutralityGaugeCardConfig } from "../types";

const LEVELS: LevelDefinition[] = [
  { level: -1, stroke: "var(--energy-grid-return-color)" },
  { level: 0, stroke: "var(--energy-grid-consumption-color)" },
];

@customElement("hui-energy-grid-neutrality-gauge-card")
class HuiEnergyGridGaugeCard extends LitElement implements LovelaceCard {
  public static async getConfigElement() {
    await import("../../editor/config-elements/hui-energy-graph-card-editor");
    return document.createElement("hui-energy-graph-card-editor");
  }

  @state() private _config?: EnergyGridNeutralityGaugeCardConfig;

  public static getStubConfig(
    _hass: HomeAssistant,
    _entities: string[],
    _entitiesFill: string[]
  ): EnergyGridNeutralityGaugeCardConfig {
    return {
      type: "energy-grid-neutrality-gauge",
    };
  }

  @state() private _data?: EnergyData;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: HomeAssistantInternationalization;

  constructor() {
    super();
    new EnergyCollectionController(this, {
      config: () => this._config,
      onData: (data) => {
        this._data = data;
      },
    });
  }

  public getCardSize(): number {
    return 4;
  }

  public setConfig(config: EnergyGridNeutralityGaugeCardConfig): void {
    if (config.collection_key) {
      validateEnergyCollectionKey(config.collection_key);
    }
    this._config = config;
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    if (!this._data) {
      return html`${this._i18n.localize("ui.panel.lovelace.cards.energy.loading")}`;
    }
    const { summedData, compareSummedData: _ } = getSummedData(this._data);

    let value: number | undefined;

    if (!("from_grid" in summedData.total)) {
      return nothing;
    }

    const consumedFromGrid = summedData.total.from_grid ?? 0;

    const returnedToGrid = summedData.total.to_grid ?? 0;

    if (consumedFromGrid !== null && returnedToGrid !== null) {
      if (returnedToGrid > consumedFromGrid) {
        value = (1 - consumedFromGrid / returnedToGrid) * -1;
      } else if (returnedToGrid < consumedFromGrid) {
        value = 1 - returnedToGrid / consumedFromGrid;
      } else {
        value = 0;
      }
    }

    return html`
      <ha-card>
        ${
          value !== undefined
            ? html`
                <ha-gauge
                  min="-1"
                  max="1"
                  .value=${value}
                  .valueText=${formatNumber(
                    Math.abs(returnedToGrid! - consumedFromGrid!),
                    this._i18n.locale,
                    { maximumFractionDigits: 2 }
                  )}
                  .locale=${this._i18n.locale}
                  .levels=${LEVELS}
                  label="kWh"
                  needle
                ></ha-gauge>
                <ha-svg-icon
                  id="info"
                  .path=${mdiInformationOutline}
                ></ha-svg-icon>
                <ha-tooltip for="info" placement="left">
                  ${this._i18n.localize(
                    "ui.panel.lovelace.cards.energy.grid_neutrality_gauge.energy_dependency"
                  )}
                  <br /><br />
                  ${this._i18n.localize(
                    "ui.panel.lovelace.cards.energy.grid_neutrality_gauge.color_explain"
                  )}
                </ha-tooltip>
                <div class="name">
                  ${
                    returnedToGrid! >= consumedFromGrid!
                      ? this._i18n.localize(
                          "ui.panel.lovelace.cards.energy.grid_neutrality_gauge.net_returned_grid"
                        )
                      : this._i18n.localize(
                          "ui.panel.lovelace.cards.energy.grid_neutrality_gauge.net_consumed_grid"
                        )
                  }
                </div>
              `
            : this._i18n.localize(
                "ui.panel.lovelace.cards.energy.grid_neutrality_gauge.grid_neutrality_not_calculated"
              )
        }
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
    "hui-energy-grid-neutrality-gauge-card": HuiEnergyGridGaugeCard;
  }
}
