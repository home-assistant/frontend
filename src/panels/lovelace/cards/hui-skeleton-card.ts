import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-card";
import "../../../components/skeletons/ha-skeleton-tile";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../types";
import type { SkeletonCardConfig } from "./types";

@customElement("hui-skeleton-card")
export class HuiSkeletonCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) private _config?: SkeletonCardConfig;

  public getCardSize(): number {
    switch (this._config?.skeleton_type ?? "tile") {
      case "tile":
      default:
        return 1;
    }
  }

  public getGridOptions(): LovelaceGridOptions {
    switch (this._config?.skeleton_type ?? "tile") {
      case "tile":
      default:
        return {
          columns: 6,
          rows: 1,
          min_columns: 6,
          min_rows: 1,
        };
    }
  }

  public setConfig(config: SkeletonCardConfig): void {
    this._config = config;
  }

  protected render() {
    return html`
      <ha-card>
        <div class="card-content">
          <ha-skeleton-tile></ha-skeleton-tile>
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }

    ha-card {
      height: 100%;
    }

    .card-content {
      padding: var(--ha-space-2);
      height: 100%;
      box-sizing: border-box;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-skeleton-card": HuiSkeletonCard;
  }
}
