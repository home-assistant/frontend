import { css, CSSResultGroup } from "lit";
import { computeCardSize } from "../common/compute-card-size";
import { HuiStackCard } from "./hui-stack-card";

class HuiVerticalStackCard extends HuiStackCard {
  public async getCardSize() {
    if (!this._cards) {
      return 0;
    }

    const promises: Array<Promise<number> | number> = [];

    for (const element of this._cards) {
      promises.push(computeCardSize(element));
    }

    const results = await Promise.all(promises);

    return results.reduce((partial_sum, a) => partial_sum + a, 0);
  }

  static get styles(): CSSResultGroup {
    return [
      super.sharedStyles,
      css`
        #root {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        #root > * {
          margin: var(
            --vertical-stack-card-margin,
            var(--stack-card-margin, 4px 0)
          );
        }
        #root > *:first-child {
          margin-top: 0;
        }
        #root > *:last-child {
          margin-bottom: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-vertical-stack-card": HuiVerticalStackCard;
  }
}

customElements.define("hui-vertical-stack-card", HuiVerticalStackCard);
