import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { LovelaceConfig } from "../../../../data/lovelace/config/types";
import { LovelaceStrategyEditor } from "../types";
import { OriginalStatesViewStrategyConfig } from "./original-states-view-strategy";

export type OriginalStatesDashboardStrategyConfig =
  OriginalStatesViewStrategyConfig;

@customElement("original-states-dashboard-strategy")
export class OriginalStatesDashboardStrategy extends ReactiveElement {
  static async generate(
    config: OriginalStatesDashboardStrategyConfig
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
      "../../editor/dashboard-strategy-editor/hui-original-states-dashboard-strategy-editor"
    );
    return document.createElement(
      "hui-original-states-dashboard-strategy-editor"
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "original-states-dashboard-strategy": OriginalStatesDashboardStrategy;
  }
}
