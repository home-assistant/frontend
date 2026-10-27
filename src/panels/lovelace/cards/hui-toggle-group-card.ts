import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../common/color/compute-color";
import { consume } from "../../../common/decorators/consume";
import {
  consumeEntityStates,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../../../common/translations/localize";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateActive } from "../../../common/entity/state_active";
import { stateColorCss } from "../../../common/entity/state_color";
import "../../../components/ha-card";
import "../../../components/tile/ha-tile-container";
import "../../../components/tile/ha-tile-icon";
import "../../../components/tile/ha-tile-info";
import { apiContext } from "../../../data/context";
import { forwardHaptic } from "../../../data/haptics";
import type { HomeAssistantApi } from "../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../types";
import type { ToggleGroupCardConfig } from "./types";
import { getToggleAction } from "../../../common/entity/get_toggle_action";

@customElement("hui-toggle-group-card")
export class HuiToggleGroupCard extends LitElement implements LovelaceCard {
  @state() private _config?: ToggleGroupCardConfig;

  @state()
  @consumeEntityStates({ entityIdPath: ["_config", "entities"] })
  private _stateObjs?: Record<string, HassEntity>;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  public setConfig(config: ToggleGroupCardConfig): void {
    if (!config.entities?.length) {
      throw new Error("Entities are required");
    }
    this._config = config;
  }

  public getCardSize(): number {
    return this._config?.vertical ? 2 : 1;
  }

  public getGridOptions(): LovelaceGridOptions {
    const columns = 6;
    let rows = 1;
    let min_columns = 6;

    if (this._config?.vertical) {
      rows++;
      min_columns = 3;
    }

    return {
      columns,
      rows,
      min_columns,
      min_rows: rows,
    };
  }

  private _getOnEntities(): HassEntity[] {
    if (!this._config || !this._stateObjs) return [];
    // Walk the configured order: the states record keeps its identity when
    // only the order of the entities changed.
    return this._config.entities
      .map((entityId) => this._stateObjs![entityId])
      .filter(
        (stateObj): stateObj is HassEntity =>
          stateObj !== undefined && stateActive(stateObj)
      );
  }

  private _computeColor(): string | undefined {
    if (!this._config) return undefined;

    const onEntities = this._getOnEntities();
    if (onEntities.length === 0) return undefined;

    if (this._config.color) {
      return computeCssColor(this._config.color);
    }

    return stateColorCss(onEntities[0]);
  }

  private _computeLabel(): string {
    if (!this._config) return "";
    const onCount = this._getOnEntities().length;
    const total = this._config.entities.length;

    if (onCount === 0) {
      return this._localize("ui.card.toggle-group.all_off");
    }
    if (onCount === total) {
      return this._localize("ui.card.toggle-group.all_on");
    }
    return this._localize("ui.card.toggle-group.some_on", {
      on_count: onCount,
      total_count: total,
    });
  }

  private _computeIconLabel(): string {
    const turnOn = this._getOnEntities().length === 0;
    const title = this._config!.title;
    if (title) {
      return this._localize(
        turnOn
          ? "ui.card.toggle-group.turn_on_name"
          : "ui.card.toggle-group.turn_off_name",
        { name: title }
      );
    }
    return this._localize(
      turnOn
        ? "ui.card.toggle-group.turn_all_on"
        : "ui.card.toggle-group.turn_all_off"
    );
  }

  private _handleTap(): void {
    if (!this._config) return;
    const onEntities = this._getOnEntities();
    const domain = computeDomain(this._config.entities[0]);

    const service = getToggleAction(domain, onEntities.length === 0);

    this._api.callService(domain, service, {
      entity_id: this._config.entities,
    });
    forwardHaptic(this, "light");
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    const color = this._computeColor();
    const style = {
      "--tile-color": color,
    };

    const label = this._computeLabel();
    const primary = this._config.title || label;
    const secondary = this._config.title ? label : undefined;
    return html`
      <ha-card style=${styleMap(style)}>
        <ha-tile-container .vertical=${Boolean(this._config.vertical)}>
          <ha-tile-icon
            slot="icon"
            icon="mdi:power"
            .interactive=${true}
            .accessibleLabel=${this._computeIconLabel()}
            @action=${this._handleTap}
          ></ha-tile-icon>
          <ha-tile-info
            slot="info"
            .primary=${primary}
            .secondary=${secondary}
          ></ha-tile-info>
        </ha-tile-container>
      </ha-card>
    `;
  }

  static styles = css`
    :host {
      --tile-color: var(--state-inactive-color);
    }
    ha-card {
      background: none;
      backdrop-filter: none;
      border: none;
      box-shadow: none;
      height: 100%;
    }
    ha-tile-icon {
      --tile-icon-color: var(--tile-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-toggle-group-card": HuiToggleGroupCard;
  }
}
