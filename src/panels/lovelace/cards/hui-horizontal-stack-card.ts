import type { CSSResultGroup } from "lit";
import { css } from "lit";
import { customElement } from "lit/decorators";
import { computeCardSize } from "../common/compute-card-size";
import { HuiStackCard } from "./hui-stack-card";

@customElement("hui-horizontal-stack-card")
export class HuiHorizontalStackCard extends HuiStackCard {
  public async getCardSize(): Promise<number> {
    if (!this._cards) {
      return 0;
    }

    const promises: (Promise<number> | number)[] = [];

    for (const element of this._cards) {
      promises.push(computeCardSize(element));
    }

    const results = await Promise.all(promises);

    return Math.max(...results);
  }

  static get styles(): CSSResultGroup {
    return [
      super.sharedStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        #root {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: minmax(0, 1fr);
          flex: 1;
          min-height: 0;
          gap: var(--horizontal-stack-card-gap, var(--stack-card-gap, 8px));
        }
        #root > hui-card {
          display: contents;
        }
        /* Cards stretch to the tallest one */
        #root > hui-card > ha-skeleton-overlay {
          display: flex;
          flex-direction: column;
        }
        #root > hui-card > ha-skeleton-overlay > * {
          flex: 1;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-horizontal-stack-card": HuiHorizontalStackCard;
  }
}
