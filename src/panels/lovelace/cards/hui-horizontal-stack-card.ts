import { css, CSSResultGroup } from "lit";
import { customElement } from "lit/decorators";
import { computeCardSize } from "../common/compute-card-size";
import { HuiStackCard } from "./hui-stack-card";

@customElement("hui-horizontal-stack-card")
export class HuiHorizontalStackCard extends HuiStackCard {
  public async getCardSize(): Promise<number> {
    if (!this._cards) {
      return 0;
    }

    const promises: Array<Promise<number> | number> = [];

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
        #root {
          display: flex;
          height: 100%;
        }
        #root > * {
          flex: 1 1 0;
          margin: var(
            --horizontal-stack-card-margin,
            var(--stack-card-margin, 0 4px)
          );
          min-width: 0;
        }
        #root[dir="ltr"] > *:first-child {
          margin-left: 0;
        }
        #root[dir="ltr"] > *:last-child {
          margin-right: 0;
        }
        #root[dir="rtl"] > *:first-child {
          margin-right: 0;
        }
        #root[dir="rtl"] > *:last-child {
          margin-left: 0;
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
