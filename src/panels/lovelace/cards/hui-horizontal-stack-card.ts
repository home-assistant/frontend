import { html } from "@polymer/lit-element";

import computeCardSize from "../common/compute-card-size.js";

import { LovelaceCard, LovelaceConfig } from "../types";
import HuiStackCard from "./hui-stack-card";

interface Config extends LovelaceConfig {
  cards: LovelaceConfig[];
}

class HuiHorizontalStackCard extends HuiStackCard implements LovelaceCard {
  protected config?: Config;

  public getCardSize() {
    let size = 1;
    for (const element of this.shadowRoot!.querySelectorAll("#root > *")) {
      const elSize = computeCardSize(element);
      size = elSize > size ? elSize : size;
    }

    return size;
  }

  protected renderStyle() {
    return html`
      <style>
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
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-horitzontal-stack-card": HuiHorizontalStackCard;
  }
}

customElements.define("hui-horizontal-stack-card", HuiHorizontalStackCard);
