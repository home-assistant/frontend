import { css } from "lit";
import { CheckListItemBase } from "@material/mwc-list/mwc-check-list-item-base";
import { styles as controlStyles } from "@material/mwc-list/mwc-control-list-item.css";
import { styles } from "@material/mwc-list/mwc-list-item.css";
import { customElement } from "lit/decorators";

@customElement("ha-check-list-item")
export class HaCheckListItem extends CheckListItemBase {
  static override styles = [
    styles,
    controlStyles,
    css`
      :host {
        --mdc-theme-secondary: var(--primary-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-check-list-item": HaCheckListItem;
  }
}
