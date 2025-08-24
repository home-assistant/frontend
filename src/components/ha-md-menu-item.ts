import { MenuItemEl } from "@material/web/menu/internal/menuitem/menu-item";
import { styles } from "@material/web/menu/internal/menuitem/menu-item-styles";
import { css } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-md-menu-item")
export class HaMdMenuItem extends MenuItemEl {
  @property({ attribute: false }) clickAction?: (item?: HTMLElement) => void;

  static override styles = [
    styles,
    css`
      :host {
        --ha-icon-display: block;
        --md-sys-color-primary: var(--primary-text-color);
        --md-sys-color-on-primary: var(--primary-text-color);
        --md-sys-color-secondary: var(--secondary-text-color);
        --md-sys-color-surface: var(--card-background-color);
        --md-sys-color-on-surface: var(--primary-text-color);
        --md-sys-color-on-surface-variant: var(--secondary-text-color);
        --md-sys-color-secondary-container: rgb(
          from var(--primary-color) r g b / 0.15
        );
        --md-sys-color-on-secondary-container: var(--text-primary-color);
        --mdc-icon-size: 16px;

        --md-sys-color-on-primary-container: var(--primary-text-color);
        --md-sys-color-on-secondary-container: var(--primary-text-color);
        --md-menu-item-label-text-font: Roboto, sans-serif;
      }
      :host(.warning) {
        --md-menu-item-label-text-color: var(--error-color);
        --md-menu-item-leading-icon-color: var(--error-color);
      }
      ::slotted([slot="headline"]) {
        text-wrap: nowrap;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-md-menu-item": HaMdMenuItem;
  }
}
