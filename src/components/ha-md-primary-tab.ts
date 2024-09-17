import { customElement } from "lit/decorators";
import { MdPrimaryTab } from "@material/web/tabs/primary-tab";

@customElement("ha-md-primary-tab")
export class HaMdPrimaryTab extends MdPrimaryTab {}

declare global {
  interface HTMLElementTagNameMap {
    "ha-md-primary-tab": HaMdPrimaryTab;
  }
}
