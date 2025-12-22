import { ListBase } from "@material/mwc-list/mwc-list-base";
import { styles } from "@material/mwc-list/mwc-list.css";
import { customElement } from "lit/decorators";
import type { HaCheckListItem } from "./ha-check-list-item";
import type { HaRadioListItem } from "./ha-radio-list-item";

@customElement("ha-list")
export class HaList extends ListBase {
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("selected", this._syncItemRoles);
    this.addEventListener("items-updated", this._syncItemRoles);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("selected", this._syncItemRoles);
    this.removeEventListener("items-updated", this._syncItemRoles);
  }

  protected override updateItems() {
    super.updateItems();
    this._syncItemRoles();
  }

  private _syncItemRoles = () => {
    const isMenu = this.innerRole === "menu";
    const defaultRole = this.itemRoles;

    this.items.forEach((item) => {
      if (item.tagName === "HA-CHECK-LIST-ITEM") {
        const checkboxItem = item as HaCheckListItem;
        if (isMenu) {
          item.setAttribute("role", "menuitemcheckbox");
          item.setAttribute(
            "aria-checked",
            checkboxItem.indeterminate
              ? "mixed"
              : checkboxItem.selected
                ? "true"
                : "false"
          );
        } else if (defaultRole) {
          item.setAttribute("role", defaultRole);
          item.removeAttribute("aria-checked");
        } else {
          item.removeAttribute("role");
          item.removeAttribute("aria-checked");
        }
      } else if (item.tagName === "HA-RADIO-LIST-ITEM") {
        const radioItem = item as HaRadioListItem;
        if (isMenu) {
          item.setAttribute("role", "menuitemradio");
          item.setAttribute(
            "aria-checked",
            radioItem.selected ? "true" : "false"
          );
        } else if (defaultRole) {
          item.setAttribute("role", defaultRole);
          item.removeAttribute("aria-checked");
        } else {
          item.removeAttribute("role");
          item.removeAttribute("aria-checked");
        }
      } else if (defaultRole) {
        item.setAttribute("role", defaultRole);
        item.removeAttribute("aria-checked");
      } else {
        item.removeAttribute("role");
        item.removeAttribute("aria-checked");
      }
    });
  };

  static styles = styles;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-list": HaList;
  }
}
