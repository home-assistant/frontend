import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../common/color/compute-color";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateActive } from "../../../common/entity/state_active";
import { stateColorCss } from "../../../common/entity/state_color";
import "../../../components/ha-card";
import "../../../components/tile/ha-tile-container";
import "../../../components/tile/ha-tile-icon";
import "../../../components/tile/ha-tile-info";
import { forwardHaptic } from "../../../data/haptics";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../types";
import type { ToggleGroupCardConfig } from "./types";

@customElement("hui-toggle-group-card")
export class HuiToggleGroupCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: ToggleGroupCardConfig;

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
    if (!this.hass || !this._config) return [];
    return this._config.entities
      .map((entityId) => this.hass!.states[entityId])
      .filter(
        (stateObj): stateObj is HassEntity =>
          stateObj !== undefined && stateActive(stateObj)
      );
  }

  private _computeColor(): string | undefined {
    if (!this._config || !this.hass) return undefined;

    const onEntities = this._getOnEntities();
    if (onEntities.length === 0) return undefined;

    if (this._config.color) {
      return computeCssColor(this._config.color);
    }

    return stateColorCss(onEntities[0]);
  }

  private _computeSecondary(): string {
    if (!this.hass || !this._config) return "";
    const onCount = this._getOnEntities().length;
    const total = this._config.entities.length;

    if (onCount === 0) {
      return this.hass.localize("ui.card.toggle-group.all_off");
    }
    if (onCount === total) {
      return this.hass.localize("ui.card.toggle-group.all_on");
    }
    return this.hass.localize("ui.card.toggle-group.some_on", {
      on_count: onCount,
      total_count: total,
    });
  }

  private _handleTap(): void {
    if (!this.hass || !this._config) return;
    const onEntities = this._getOnEntities();
    const domain = computeDomain(this._config.entities[0]);

    let service: string;
    if (domain === "cover") {
      service = onEntities.length > 0 ? "close_cover" : "open_cover";
    } else {
      service = onEntities.length > 0 ? "turn_off" : "turn_on";
    }

    this.hass.callService(domain, service, {
      entity_id: this._config.entities,
    });
    forwardHaptic(this, "light");
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const color = this._computeColor();
    const style = {
      "--tile-color": color,
    };
    return html`
      <ha-card style=${styleMap(style)}>
        <ha-tile-container .vertical=${Boolean(this._config.vertical)}>
          <ha-tile-icon
            slot="icon"
            icon="mdi:power"
            .interactive=${true}
            @action=${this._handleTap}
          ></ha-tile-icon>
          <ha-tile-info
            slot="info"
            .primary=${this._config.title}
            .secondary=${this._computeSecondary()}
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
      -webkit-backdrop-filter: none;
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
