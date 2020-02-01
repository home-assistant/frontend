import { customElement } from "lit-element";

import { HuiButtonsBase } from "../components/hui-buttons-base";
import { LovelaceHeaderFooter } from "../types";
import { ButtonsHeaderFooterConfig } from "./types";
import { processConfigEntities } from "../common/process-config-entities";

@customElement("hui-buttons-header-footer")
export class HuiButtonsHeaderFooter extends HuiButtonsBase
  implements LovelaceHeaderFooter {
  public setConfig(config: ButtonsHeaderFooterConfig): void {
    this._configEntities = processConfigEntities(config.entities);
    this.requestUpdate();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-buttons-header-footer": HuiButtonsHeaderFooter;
  }
}
