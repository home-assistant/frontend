import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { LovelaceStrategyEditor } from "../types";
import type { IframeViewStrategyConfig } from "./iframe-view-strategy";

export type IframeDashboardStrategyConfig = IframeViewStrategyConfig;

@customElement("iframe-dashboard-strategy")
export class IframeDashboardStrategy extends ReactiveElement {
  static async generate(
    config: IframeDashboardStrategyConfig
  ): Promise<LovelaceConfig> {
    return {
      views: [
        {
          strategy: config,
        },
      ],
    };
  }

  public static async getConfigElement(): Promise<LovelaceStrategyEditor> {
    await import(
      "../../editor/dashboard-strategy-editor/hui-iframe-dashboard-strategy-editor"
    );
    return document.createElement("hui-iframe-dashboard-strategy-editor");
  }

  static configRequired = true;
}

declare global {
  interface HTMLElementTagNameMap {
    "iframe-dashboard-strategy": IframeDashboardStrategy;
  }
}
