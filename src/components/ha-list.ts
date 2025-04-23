import { ListBase } from "@material/mwc-list/mwc-list-base";
import { styles } from "@material/mwc-list/mwc-list.css";
import { customElement, queryAssignedElements } from "lit/decorators";

@customElement("ha-list")
export class HaList extends ListBase {
  @queryAssignedElements({ flatten: true, selector: "*" })
  protected assignedElements!: HTMLElement[] | null;

  @queryAssignedElements({ flatten: true, selector: '[tabindex="0"]' })
  protected tabbableElements!: HTMLElement[] | null;

  static styles = styles;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-list": HaList;
  }
}
