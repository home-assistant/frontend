import { DrawerBase } from "@material/mwc-drawer/mwc-drawer-base";
import { styles } from "@material/mwc-drawer/mwc-drawer.css";
import type { PropertyValues } from "lit";
import { css } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";

const blockingElements = (document as any).$blockingElements;

@customElement("ha-drawer")
export class HaDrawer extends DrawerBase {
  @property() public direction: "ltr" | "rtl" = "ltr";

  private _mc?: HammerManager;

  private _rtlStyle?: HTMLElement;

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
      if (this.direction === "rtl") {
        this._rtlStyle = document.createElement("style");
        this._rtlStyle.innerHTML = `
          .mdc-drawer--animate {
            transform: translateX(100%);
          }
          .mdc-drawer--opening {
            transform: translateX(0);
          }
          .mdc-drawer--closing {
            transform: translateX(100%);
          }
        `;

        this.shadowRoot!.appendChild(this._rtlStyle);
      } else if (this._rtlStyle) {
        this.shadowRoot!.removeChild(this._rtlStyle);
      }
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
        position: fixed;
        top: 0;
        border-color: var(--divider-color, rgba(0, 0, 0, 0.12));
        inset-inline-start: 0 !important;
        inset-inline-end: initial !important;
        transition-property: transform, width;
        transition-duration:
          var(--mdc-drawer-transition-duration, 0.2s),
          var(--ha-animation-base-duration);
        transition-timing-function:
          var(
            --mdc-drawer-transition-timing-function,
            cubic-bezier(0.4, 0, 0.2, 1)
          ),
          ease;
      }
      .mdc-drawer.mdc-drawer--modal.mdc-drawer--open {
        z-index: 200;
      }
      .mdc-drawer-app-content {
        overflow: unset;
        flex: none;
        padding-left: var(--mdc-drawer-width);
        padding-inline-start: var(--mdc-drawer-width);
        padding-inline-end: initial;
        direction: var(--direction);
        width: 100%;
        box-sizing: border-box;
        transition:
          padding-left var(--ha-animation-base-duration) ease,
          padding-inline-start var(--ha-animation-base-duration) ease;
      }
      @media (prefers-reduced-motion: reduce) {
        .mdc-drawer,
        .mdc-drawer-app-content {
          transition: none;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-drawer": HaDrawer;
  }
}
