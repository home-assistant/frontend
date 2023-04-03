import { DIRECTION_LEFT, Manager, Swipe } from "@egjs/hammerjs";
import { DrawerBase } from "@material/mwc-drawer/mwc-drawer-base";
import { styles } from "@material/mwc-drawer/mwc-drawer.css";
import { css, PropertyValues } from "lit";
import { customElement } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";

const blockingElements = (document as any).$blockingElements;

@customElement("ha-drawer")
export class HaDrawer extends DrawerBase {
  private _mc?: HammerManager;

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

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("open") && this.open && this.type === "modal") {
      this._mc = new Manager(document, {
        touchAction: "pan-y",
      });
      this._mc.add(
        new Swipe({
          direction: DIRECTION_LEFT,
        })
      );
      this._mc.on("swipeleft", () => {
        fireEvent(this, "hass-toggle-menu", { open: false });
      });
    } else if (this._mc) {
      this._mc.destroy();
      this._mc = undefined;
    }
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
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-drawer": HaDrawer;
  }
}
