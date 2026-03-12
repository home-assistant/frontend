import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-card";
import "../../../components/ha-skeleton";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../types";

@customElement("hui-skeleton-card")
export class HuiSkeletonCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass?: HomeAssistant;

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): LovelaceGridOptions {
    return {
      columns: 6,
      rows: 3,
      min_columns: 3,
      min_rows: 3,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public setConfig(): void {}

  protected render() {
    return html`
      <ha-card>
        <div class="card-content">
          <ha-skeleton class="title"></ha-skeleton>
          <ha-skeleton></ha-skeleton>
          <ha-skeleton></ha-skeleton>
          <ha-skeleton class="short"></ha-skeleton>
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-skeleton-card": HuiSkeletonCard;
  }
}
