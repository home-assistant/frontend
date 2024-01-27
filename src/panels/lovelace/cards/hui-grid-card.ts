import { css, CSSResultGroup } from "lit";
import { computeCardSize } from "../common/compute-card-size";
import { LovelaceCardEditor } from "../types";
import { HuiStackCard } from "./hui-stack-card";
import { GridCardConfig } from "./types";

export const DEFAULT_COLUMNS = 3;
const SQUARE_ROW_HEIGHTS_BY_COLUMNS = {
  1: 5,
  2: 3,
  3: 2,
};

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
      const rowHeight = SQUARE_ROW_HEIGHTS_BY_COLUMNS[this.columns] || 1;
      return (
        (this._cards.length < this.columns
          ? rowHeight
          : (this._cards.length / this.columns) * rowHeight) +
        (this._config.title ? 1 : 0)
      );
    }

    const promises: Array<Promise<number> | number> = [];

    for (const element of this._cards) {
      promises.push(computeCardSize(element));
    }

    const cardSizes = await Promise.all(promises);

    let totalHeight = this._config.title ? 1 : 0;

    // Each column will adjust to max card size of it's row
    for (let start = 0; start < cardSizes.length; start += this.columns) {
      totalHeight += Math.max(...cardSizes.slice(start, start + this.columns));
    }

    return totalHeight;
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
    if (this.square) {
      this.setAttribute("square", "");
    } else {
      this.removeAttribute("square");
    }
  }

  static get styles(): CSSResultGroup {
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

        :host([square]) #root > *:not([hidden]) {
          grid-row: 1 / 1;
          grid-column: 1 / 1;
        }
        :host([square]) #root > *:not([hidden]) ~ *:not([hidden]) {
          /*
	       * Remove grid-row and grid-column from every element that comes after
	       * the first not-hidden element
	       */
          grid-row: unset;
          grid-column: unset;
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
