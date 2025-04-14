import { css } from "lit";
import { customElement } from "lit/decorators";
import { HaMdListItem } from "./ha-md-list-item";

@customElement("ha-combo-box-item")
export class HaComboBoxItem extends HaMdListItem {
  static override styles = [
    ...super.styles,
    css`
      :host {
        --md-list-item-two-line-container-height: 64px;
        --md-list-item-leading-space: 12px;
        --md-list-item-trailing-space: 12px;
      }
      md-item {
        gap: 8px;
        border-bottom: 1px solid var(--divider-color);
      }
      [slot="start"] {
        --paper-item-icon-color: var(--secondary-text-color);
        width: 40px;
      }
      [slot="headline"],
      [slot="supporting-text"] {
        white-space: nowrap;
      }
      [slot="headline"] {
        line-height: 22px;
        font-size: 14px;
      }
      [slot="supporting-text"] {
        line-height: 18px;
        font-size: 12px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-combo-box-item": HaComboBoxItem;
  }
}
