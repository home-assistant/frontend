import { MdSubMenu } from "@material/web/menu/sub-menu";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-sub-menu")
export class HaSubMenu extends MdSubMenu {
  async show() {
    super.show();
    this.menu.hasOverflow = false;
  }

  static override styles = [
    ...super.styles,
    css`
      :host {
        --ha-icon-display: block;
        --md-sys-color-primary: var(--primary-text-color);
        --md-sys-color-on-primary: var(--primary-text-color);
        --md-sys-color-secondary: var(--secondary-text-color);
        --md-sys-color-surface: var(--card-background-color);
        --md-sys-color-on-surface: var(--primary-text-color);
        --md-sys-color-on-surface-variant: var(--secondary-text-color);
        --md-sys-color-secondary-container: rgba(
          var(--rgb-primary-color),
          0.15
        );
        --md-sys-color-on-secondary-container: var(--text-primary-color);
        --mdc-icon-size: 16px;

        --md-sys-color-on-primary-container: var(--primary-text-color);
        --md-sys-color-on-secondary-container: var(--primary-text-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-sub-menu": HaSubMenu;
  }
}
