import Drawer from "@awesome.me/webawesome/dist/components/drawer/drawer";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-wa-drawer")
export class HaWaDrawer extends Drawer {
  static get styles() {
    return [
      Drawer.styles,
      css`
        :host {
          --wa-color-surface-raised: var(
            --ha-dialog-surface-background,
            var(--mdc-theme-surface, #fff)
          );
          --spacing: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    // @ts-ignore
    "ha-wa-drawer": HaWaDrawer;
  }
}
