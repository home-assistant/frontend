import type { CSSResultGroup } from "lit";
import { css } from "lit";
import { customElement } from "lit/decorators";
import { haStyleScrollbar } from "../../../resources/styles";
import { computeCardSize } from "../common/compute-card-size";
import { HuiStackCard } from "./hui-stack-card";

@customElement("hui-vertical-stack-card")
class HuiVerticalStackCard extends HuiStackCard {
  protected override get _rootClass() {
    return typeof this._config?.grid_options?.rows === "number"
      ? "ha-scrollbar"
      : undefined;
  }

  public async getCardSize() {
    if (!this._cards) {
      return 0;
    }

    const promises: (Promise<number> | number)[] = [];

    for (const element of this._cards) {
      promises.push(computeCardSize(element));
    }

    const results = await Promise.all(promises);

    return results.reduce((partial_sum, a) => partial_sum + a, 0);
  }

  static get styles(): CSSResultGroup {
    return [
      super.sharedStyles,
      haStyleScrollbar,
      css`
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        #root {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          gap: var(--vertical-stack-card-gap, var(--stack-card-gap, 8px));
        }
        #root.ha-scrollbar {
          overflow-x: clip;
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
