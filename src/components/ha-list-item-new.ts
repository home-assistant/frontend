import { MdListItem } from "@material/web/list/list-item";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-list-item-new")
export class HaListItemNew extends MdListItem {
  static override styles = [
    ...super.styles,
    css`
      :host {
        --ha-icon-display: block;
        --md-sys-color-primary: var(--primary-text-color);
        --md-sys-color-secondary: var(--secondary-text-color);
        --md-sys-color-surface: var(--card-background-color);
        --md-sys-color-on-surface: var(--primary-text-color);
        --md-sys-color-on-surface-variant: var(--secondary-text-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-list-item-new": HaListItemNew;
  }
}
