import { customElement } from "lit-element";

import { HuiButtonRow } from "./hui-button-row";

@customElement("hui-call-service-row")
class HuiCallServiceRow extends HuiButtonRow {}

declare global {
  interface HTMLElementTagNameMap {
    "hui-call-service-row": HuiCallServiceRow;
  }
}
