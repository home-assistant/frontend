import { SelectOptionEl } from "@material/web/select/internal/selectoption/select-option";
import { styles } from "@material/web/menu/internal/menuitem/menu-item-styles";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-md-select-option")
export class HaMdSelectOption extends SelectOptionEl {
  static override styles = [
    styles,
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
    "ha-md-select-option": HaMdSelectOption;
  }
}
