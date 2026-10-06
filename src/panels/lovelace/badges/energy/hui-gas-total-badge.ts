import { mdiFire } from "@mdi/js";
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
import type { GasTotalBadgeConfig } from "../types";

@customElement("hui-gas-total-badge")
export class HuiGasTotalBadge extends LitElement implements LovelaceBadge {
  @state()
  @consume({ context: statesContext, subscribe: true })
  @transform<HassEntities, HassEntities>({
    transformer: function (this: HuiGasTotalBadge, states) {
      const tracked: HassEntities = {};
      this._data?.prefs.energy_sources.forEach((source) => {
        if (
          source.type === "gas" &&
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

  @state() private _config?: GasTotalBadgeConfig;

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

  public setConfig(config: GasTotalBadgeConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this._config || !this._data || !this._i18n) {
      return nothing;
    }

    const { value, unit } = computeTotalFlowRate(
      "gas",
      this._data.prefs,
      this._states
    );
    const displayValue = `${formatNumber(value, this._i18n.locale, { maximumFractionDigits: 1 })} ${unit}`;

    const name =
      this._config.title ||
      this._i18n.localize("ui.panel.lovelace.cards.energy.gas_total_title");

    return html`
      <ha-badge .label=${name}>
        <ha-svg-icon slot="icon" .path=${mdiFire}></ha-svg-icon>
        ${displayValue}
      </ha-badge>
    `;
  }

  static styles = css`
    ha-badge {
      --badge-color: var(--energy-gas-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-gas-total-badge": HuiGasTotalBadge;
  }
}
