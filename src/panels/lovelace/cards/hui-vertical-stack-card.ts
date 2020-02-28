import { CSSResult, css } from "lit-element";

import { computeCardSize } from "../common/compute-card-size";
import { HuiStackCard } from "./hui-stack-card";

class HuiVerticalStackCard extends HuiStackCard {
  public getCardSize() {
    let totalSize = 0;

    if (!this._cards) {
      return totalSize;
    }

    for (const element of this._cards) {
      totalSize += computeCardSize(element);
    }

    return totalSize;
  }

  static get styles(): CSSResult[] {
    return [
      super.sharedStyles,
      css`
        #root {
          display: flex;
          flex-direction: column;
        }
        #root > * {
          margin: 4px 0 4px 0;
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
