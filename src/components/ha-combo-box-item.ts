import { css } from "lit";
import { customElement, property } from "lit/decorators";
import { HaMdListItem } from "./ha-md-list-item";

@customElement("ha-combo-box-item")
export class HaComboBoxItem extends HaMdListItem {
  @property({ type: Boolean, reflect: true, attribute: "border-top" })
  public borderTop = false;

  static override styles = [
    ...super.styles,
    css`
      :host {
        --md-list-item-two-line-container-height: 64px;
      }
      :host([border-top]) md-item {
        border-top: 1px solid var(--divider-color);
      }
      [slot="start"] {
        --paper-item-icon-color: var(--secondary-text-color);
      }
      [slot="headline"] {
        line-height: 22px;
        font-size: 14px;
        white-space: nowrap;
      }
      [slot="supporting-text"] {
        line-height: 18px;
        font-size: 12px;
        white-space: nowrap;
      }
      ::slotted(state-badge) {
        width: 32px;
        height: 32px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-combo-box-item": HaComboBoxItem;
  }
}
