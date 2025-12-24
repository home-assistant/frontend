import { ListBase } from "@material/mwc-list/mwc-list-base";
import { styles } from "@material/mwc-list/mwc-list.css";
import { customElement } from "lit/decorators";

@customElement("ha-list")
export class HaList extends ListBase {
  static styles = styles;

  constructor() {
    super();
    if (this.innerRole == null) this.innerRole = "list";
    if (this.itemRoles == null) this.itemRoles = "listitem";
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-list": HaList;
  }
}
