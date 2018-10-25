import { html } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import computeCardSize from "../common/compute-card-size.js";

import { LovelaceCard, LovelaceConfig } from "../types";
import HuiStackCard from "./hui-stack-card";

interface Config extends LovelaceConfig {
  cards: LovelaceConfig[];
}

class HuiHorizontalStackCard extends HuiStackCard implements LovelaceCard {
  protected config?: Config;

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

  protected renderStyle(): TemplateResult {
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
