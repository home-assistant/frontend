import { css, CSSResult } from "lit-element";
import { computeCardSize } from "../common/compute-card-size";
import { HuiStackCard } from "./hui-stack-card";
import { GridCardConfig } from "./types";

const DEFAULT_COLUMNS = 3;

class HuiGridCard extends HuiStackCard<GridCardConfig> {
  public async getCardSize(): Promise<number> {
    if (!this._cards || !this._config) {
      return 0;
    }

    const promises: Array<Promise<number> | number> = [];

    for (const element of this._cards) {
      promises.push(computeCardSize(element));
    }

    const results = await Promise.all(promises);

    const maxCardSize = Math.max(...results);

    return (
      maxCardSize *
      (this._cards.length / (this._config.columns || DEFAULT_COLUMNS))
    );
  }

  setConfig(config: GridCardConfig) {
    super.setConfig(config);
    if ("columns" in config) {
      this.style.setProperty(
        "--grid-card-column-count",
        String(config.columns)
      );
    } else {
      this.style.removeProperty("--grid-card-column-count");
    }
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
