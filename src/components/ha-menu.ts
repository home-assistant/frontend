import { MdMenu } from "@material/web/menu/menu";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-menu")
export class HaMenu extends MdMenu {
  static override styles = [
    ...super.styles,
    css`
      :host {
        --md-sys-color-surface-container: var(--card-background-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-menu": HaMenu;
  }
}
