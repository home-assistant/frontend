import { customElement } from "lit/decorators";
import "element-internals-polyfill";
import { CSSResult, css } from "lit";
import { MdMenu } from "@material/web/menu/menu";

@customElement("ha-menu")
export class HaMenu extends MdMenu {
  static override styles: CSSResult[] = [
    ...MdMenu.styles,
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
