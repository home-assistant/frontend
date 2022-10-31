import { LitElement } from "lit";
import { customElement } from "lit/decorators";

@customElement("hui-cover-position-tile-control")
class HuiCoverPositionTileControl extends LitElement {}

declare global {
  interface HTMLElementTagNameMap {
    "hui-cover-position-tile-control": HuiCoverPositionTileControl;
  }
}
