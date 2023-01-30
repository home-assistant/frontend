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

      :host([graphic="avatar"]) .mdc-deprecated-list-item__graphic,
      :host([graphic="medium"]) .mdc-deprecated-list-item__graphic,
      :host([graphic="large"]) .mdc-deprecated-list-item__graphic,
      :host([graphic="control"]) .mdc-deprecated-list-item__graphic {
        margin-inline-end: var(--mdc-list-item-graphic-margin, 16px);
        margin-inline-start: 0px;
        direction: var(--direction);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-check-list-item": HaCheckListItem;
  }
}
