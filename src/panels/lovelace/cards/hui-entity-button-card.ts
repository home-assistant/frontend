import { customElement } from "lit/decorators";
import { HuiButtonCard } from "./hui-button-card";

@customElement("hui-entity-button-card")
class HuiEntityButtonCard extends HuiButtonCard {
  public setConfig(config): void {
    if (!config.entity) {
      throw new Error("Entity must be specified");
    }
    super.setConfig(config);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-button-card": HuiEntityButtonCard;
  }
}
