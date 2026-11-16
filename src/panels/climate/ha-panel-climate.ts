import { customElement } from "lit/decorators";
import { HaHomeSummaryPanelBase } from "../home/ha-home-summary-panel-base";

@customElement("ha-panel-climate")
class PanelClimate extends HaHomeSummaryPanelBase<"climate"> {
  protected readonly _systemDataKey = "climate";
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-climate": PanelClimate;
  }
}
