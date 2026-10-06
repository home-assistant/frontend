import { mdiWater } from "@mdi/js";
import type { HassEntities } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import { preserveUnchangedEntityStatesRecord } from "../../../../common/decorators/consume-context-entry";
import { transform } from "../../../../common/decorators/transform";
import "../../../../components/ha-badge";
import "../../../../components/ha-svg-icon";
import { formatNumber } from "../../../../common/number/format_number";
import {
  internationalizationContext,
  statesContext,
} from "../../../../data/context";
import type { EnergyData } from "../../../../data/energy";
import { computeTotalFlowRate } from "../../../../data/energy";
import { EnergyCollectionController } from "../../../../data/energy-collection-controller";
import type { HomeAssistantInternationalization } from "../../../../types";
import type { LovelaceBadge } from "../../types";
import type { WaterTotalBadgeConfig } from "../types";

@customElement("hui-water-total-badge")
export class HuiWaterTotalBadge extends LitElement implements LovelaceBadge {
  @state()
  @consume({ context: statesContext, subscribe: true })
  @transform<HassEntities, HassEntities>({
    transformer: function (this: HuiWaterTotalBadge, states) {
      const tracked: HassEntities = {};
      this._data?.prefs.energy_sources.forEach((source) => {
        if (
          source.type === "water" &&
          source.stat_rate &&
          states?.[source.stat_rate]
        ) {
          tracked[source.stat_rate] = states[source.stat_rate];
        }
      });
      return preserveUnchangedEntityStatesRecord(this._states, tracked);
    },
    watch: ["_data"],
  })
  private _states: HassEntities = {};

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n?: HomeAssistantInternationalization;

  @state() private _config?: WaterTotalBadgeConfig;

  @state() private _data?: EnergyData;

  constructor() {
    super();
    new EnergyCollectionController(this, {
      config: () => this._config,
      onData: (data) => {
        this._data = data;
      },
    });
  }

  public setConfig(config: WaterTotalBadgeConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this._config || !this._data || !this._i18n) {
      return nothing;
    }

    const { value, unit } = computeTotalFlowRate(
      "water",
      this._data.prefs,
      this._states
    );
    const displayValue = `${formatNumber(value, this._i18n.locale, { maximumFractionDigits: 1 })} ${unit}`;

    const name =
      this._config.title ||
      this._i18n.localize("ui.panel.lovelace.cards.energy.water_total_title");

    return html`
      <ha-badge .label=${name}>
        <ha-svg-icon slot="icon" .path=${mdiWater}></ha-svg-icon>
        ${displayValue}
      </ha-badge>
    `;
  }

  static styles = css`
    ha-badge {
      --badge-color: var(--energy-water-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-water-total-badge": HuiWaterTotalBadge;
  }
}
