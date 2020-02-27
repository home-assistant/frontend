import { CSSResult, css } from "lit-element";

import { computeCardSize } from "../common/compute-card-size";
import { HuiStackCard } from "./hui-stack-card";

class HuiHorizontalStackCard extends HuiStackCard {
  public getCardSize(): number {
    let totalSize = 0;

    if (this._cards) {
      for (const element of this._cards) {
        const elementSize = computeCardSize(element);
        totalSize = elementSize > totalSize ? elementSize : totalSize;
      }
    }

    return totalSize;
  }

  static get styles(): CSSResult[] {
    return [
      super.sharedStyles,
      css`
        #root {
          display: flex;
        }
        #root > * {
          flex: 1 1 0;
          margin: 0 4px;
          min-width: 0;
        }
        #root > *:first-child {
          margin-left: 0;
        }
        #root > *:last-child {
          margin-right: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-horitzontal-stack-card": HuiHorizontalStackCard;
  }
}

customElements.define("hui-horizontal-stack-card", HuiHorizontalStackCard);
