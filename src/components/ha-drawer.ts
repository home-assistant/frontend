import { DrawerBase } from "@material/mwc-drawer/mwc-drawer-base";
import { styles } from "@material/mwc-drawer/mwc-drawer.css";
import { css, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";

const blockingElements = (document as any).$blockingElements;

@customElement("ha-drawer")
export class HaDrawer extends DrawerBase {
  @property() public direction: "ltr" | "rtl" = "ltr";

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
    if (changedProps.has("direction")) {
      this.mdcRoot.dir = this.direction;
    }
    if (changedProps.has("open") && this.open && this.type === "modal") {
      this._setupSwipe();
    } else if (this._mc) {
      this._mc.destroy();
      this._mc = undefined;
    }
  }

  private async _setupSwipe() {
    const hammer = await import("../resources/hammer");
    this._mc = new hammer.Manager(document, {
      touchAction: "pan-y",
    });
    this._mc.add(
      new hammer.Swipe({
        direction:
          this.direction === "rtl"
            ? hammer.DIRECTION_RIGHT
            : hammer.DIRECTION_LEFT,
      })
    );
    this._mc.on("swipeleft swiperight", () => {
      fireEvent(this, "hass-toggle-menu", { open: false });
    });
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
