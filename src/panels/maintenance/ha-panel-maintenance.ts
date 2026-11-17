import { customElement } from "lit/decorators";
import { HaHomeSummaryPanelBase } from "../home/ha-home-summary-panel-base";

@customElement("ha-panel-maintenance")
class PanelMaintenance extends HaHomeSummaryPanelBase<"maintenance"> {
  protected readonly _systemDataKey = "maintenance";
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-maintenance": PanelMaintenance;
  }
}
