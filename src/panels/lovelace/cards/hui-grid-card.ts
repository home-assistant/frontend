import { css, CSSResult } from "lit-element";
import { computeCardSize } from "../common/compute-card-size";
import { HuiStackCard } from "./hui-stack-card";
import { GridCardConfig } from "./types";
import { LovelaceCardEditor } from "../types";

const DEFAULT_COLUMNS = 3;

class HuiGridCard extends HuiStackCard<GridCardConfig> {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-grid-card-editor");
    return document.createElement("hui-grid-card-editor");
  }

  public async getCardSize(): Promise<number> {
    if (!this._cards || !this._config) {
      return 0;
    }

    if (this.square) {
      // When we're square, each row is size 2.
      return (this._cards.length / this.columns) * 2;
    }

    const promises: Array<Promise<number> | number> = [];

    for (const element of this._cards) {
      promises.push(computeCardSize(element));
    }

    const results = await Promise.all(promises);

    const maxCardSize = Math.max(...results);

    return maxCardSize * (this._cards.length / this.columns);
  }

  get columns() {
    return this._config?.columns || DEFAULT_COLUMNS;
  }

  get square() {
    return this._config?.square !== false;
  }

  setConfig(config: GridCardConfig) {
    super.setConfig(config);
    this.style.setProperty("--grid-card-column-count", String(this.columns));
    this.toggleAttribute("square", this.square);
  }

  static get styles(): CSSResult[] {
    return [
      super.sharedStyles,
      css`
        #root {
          display: grid;
          grid-template-columns: repeat(
            var(--grid-card-column-count, ${DEFAULT_COLUMNS}),
            minmax(0, 1fr)
          );
          grid-gap: var(--grid-card-gap, 8px);
        }
        :host([square]) #root {
          grid-auto-rows: 1fr;
        }
        :host([square]) #root::before {
          content: "";
          width: 0;
          padding-bottom: 100%;
          grid-row: 1 / 1;
          grid-column: 1 / 1;
        }

        :host([square]) #root > *:first-child {
          grid-row: 1 / 1;
          grid-column: 1 / 1;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-grid-card": HuiGridCard;
  }
}

customElements.define("hui-grid-card", HuiGridCard);
