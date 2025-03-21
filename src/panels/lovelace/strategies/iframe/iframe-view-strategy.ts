import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { IframeCardConfig } from "../../cards/types";

export interface IframeViewStrategyConfig {
  type: "iframe";
  url: string;
  title?: string;
}

@customElement("iframe-view-strategy")
export class IframeViewStrategy extends ReactiveElement {
  static async generate(
    config: IframeViewStrategyConfig
  ): Promise<LovelaceViewConfig> {
    return {
      type: "panel",
      title: config.title,
      cards: [
        {
          type: "iframe",
          url: config.url,
        } as IframeCardConfig,
      ],
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "iframe-view-strategy": IframeViewStrategy;
  }
}
