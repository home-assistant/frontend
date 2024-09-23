import { customElement } from "lit/decorators";
import { MdSecondaryTab } from "@material/web/tabs/secondary-tab";

@customElement("ha-md-secondary-tab")
export class HaMdSecondaryTab extends MdSecondaryTab {}

declare global {
  interface HTMLElementTagNameMap {
    "ha-md-secondary-tab": HaMdSecondaryTab;
  }
}
