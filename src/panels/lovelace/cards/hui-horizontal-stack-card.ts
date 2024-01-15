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
        #root {
          --stack-card-side-margin: 4px;
        }
        #root > * {
          flex: 1 1 0;
          margin: var(
            --horizontal-stack-card-margin,
            var(--stack-card-margin, 0 var(--stack-card-side-margin))
          );
          min-width: 0;
        }
        #root > *:first-child {
          margin-left: 0;
          margin-inline-start: 0;
          margin-inline-end: var(--stack-card-side-margin);
        }
        #root > *:last-child {
          margin-right: 0;
          margin-inline-end: 0;
          margin-inline-start: var(--stack-card-side-margin);
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
