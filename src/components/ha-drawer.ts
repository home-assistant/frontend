import { DrawerBase } from "@material/mwc-drawer/mwc-drawer-base";
import { styles } from "@material/mwc-drawer/mwc-drawer.css";
import { css } from "lit";
import { customElement } from "lit/decorators";

const blockingElements = (document as any).$blockingElements;

@customElement("ha-drawer")
export class HaDrawer extends DrawerBase {
  protected createAdapter() {
    return {
      ...super.createAdapter(),
      trapFocus: () => {
        blockingElements.push(this);
        this.appContent.inert = true;
        document.body.style.overflow = "hidden";
      },
      releaseFocus: () => {
        blockingElements.remove(this);
        this.appContent.inert = false;
        document.body.style.overflow = "";
      },
    };
  }

  static override styles = [
    styles,
    css`
      .mdc-drawer {
        top: 0;
      }
      .mdc-drawer.mdc-drawer--modal.mdc-drawer--open {
        z-index: 200;
      }
      .mdc-drawer-app-content {
        transform: translateZ(0);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-drawer": HaDrawer;
  }
}
