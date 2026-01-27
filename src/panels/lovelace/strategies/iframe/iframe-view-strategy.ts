import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { navigate } from "../../../../common/navigate";
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
    // For internal URLs, navigate directly instead of embedding in iframe
    if (config.url.startsWith("/")) {
      navigate(config.url, { replace: true });
      return {
        type: "panel",
        cards: [],
      };
    }

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
