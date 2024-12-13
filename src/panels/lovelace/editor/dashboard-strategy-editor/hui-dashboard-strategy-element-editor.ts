import { customElement } from "lit/decorators";
import type { LovelaceDashboardStrategyConfig } from "../../../../data/lovelace/config/types";
import { getLovelaceStrategy } from "../../strategies/get-strategy";
import type { LovelaceStrategyEditor } from "../../strategies/types";
import { HuiTypedElementEditor } from "../hui-typed-element-editor";

@customElement("hui-dashboard-strategy-element-editor")
export class HuiDashboardStrategyElementEditor extends HuiTypedElementEditor<LovelaceDashboardStrategyConfig> {
  protected async getConfigElement(): Promise<
    LovelaceStrategyEditor | undefined
  > {
    const elClass = await getLovelaceStrategy(
      "dashboard",
      this.configElementType!
    );

    // Check if a GUI editor exists
    if (elClass && elClass.getConfigElement) {
      return elClass.getConfigElement();
    }

    return undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dashboard-strategy-element-editor": HuiDashboardStrategyElementEditor;
  }
}
