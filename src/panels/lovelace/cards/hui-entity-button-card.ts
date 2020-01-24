import { customElement } from "lit-element";

import { HuiButtonCard } from "./hui-button-card";

@customElement("hui-entity-button-card")
class HuiEntityButtonCard extends HuiButtonCard {}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-button-card": HuiEntityButtonCard;
  }
}
