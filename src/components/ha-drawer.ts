import { DrawerBase } from "@material/mwc-drawer/mwc-drawer-base";
import { styles } from "@material/mwc-drawer/mwc-drawer.css";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-drawer")
export class HaDrawer extends DrawerBase {
  static override styles = [
    styles,
    css`
      .mdc-drawer {
        top: 0;
      }
      .mdc-drawer--modal.mdc-drawer--open {
        left: min(0px, var(--drawer-modal-left-offset));
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-drawer": HaDrawer;
  }
}
