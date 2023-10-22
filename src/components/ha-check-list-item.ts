import { CheckListItem } from "@material/mwc-list/mwc-check-list-item";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-check-list-item")
export class HaCheckListItem extends CheckListItem {
  static override styles = [
    ...super.styles,
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
