import { css } from "lit";
import { CheckListItem } from "@material/mwc-list/mwc-check-list-item";
import { customElement } from "lit/decorators";

const styles = [
  ...CheckListItem.styles,
  css`
    :host {
      --mdc-theme-secondary: var(--primary-color);
    }
  `,
];

@customElement("ha-check-list-item")
export class HaCheckListItem extends CheckListItem {
  static get styles() {
    return styles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-check-list-item": HaCheckListItem;
  }
}
