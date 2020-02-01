import { customElement } from "lit-element";

import { HuiButtonsBase } from "../components/hui-buttons-base";
import { LovelaceRow, ButtonsRowConfig } from "../entity-rows/types";
import { processConfigEntities } from "../common/process-config-entities";

@customElement("hui-buttons-row")
export class HuiButtonsRow extends HuiButtonsBase implements LovelaceRow {
  public setConfig(config: ButtonsRowConfig): void {
    this._configEntities = processConfigEntities(config.entities);
    this.requestUpdate();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-buttons-row": HuiButtonsRow;
  }
}
