import { customElement } from "lit/decorators";
import { HaHomeSummaryPanelBase } from "../home/ha-home-summary-panel-base";

@customElement("ha-panel-light")
class PanelLight extends HaHomeSummaryPanelBase<"light"> {
  protected readonly _systemDataKey = "light";
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-light": PanelLight;
  }
}
