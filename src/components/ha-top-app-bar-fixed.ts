import { TopAppBarFixedBase } from "@material/mwc-top-app-bar-fixed/mwc-top-app-bar-fixed-base";
import { styles } from "@material/mwc-top-app-bar/mwc-top-app-bar.css";
import { css } from "lit";
import { customElement, property } from "lit/decorators";

let drawerContent: HTMLElement | undefined;

@customElement("ha-top-app-bar-fixed")
export class HaTopAppBarFixed extends TopAppBarFixedBase {
  private get _drawerContent() {
    if (!drawerContent) {
      drawerContent = document
        .querySelector("home-assistant")!
        .renderRoot.querySelector("home-assistant-main")!
        .renderRoot.querySelector("ha-drawer")!
        .renderRoot.querySelector(".mdc-drawer-app-content") as HTMLElement;
    }
    return drawerContent;
  }

  @property({ type: Object })
  get scrollTarget() {
    return this._scrollTarget || this._drawerContent || window;
  }

  protected updateRootPosition() {}

  static override styles = [
    styles,
    css`
      .mdc-top-app-bar {
        position: sticky;
        top: 0;
      }
      .mdc-top-app-bar__row {
        height: var(--header-height);
        border-bottom: var(--app-header-border-bottom);
      }
      .mdc-top-app-bar--fixed-adjust {
        padding-top: 0;
      }
      .mdc-top-app-bar {
        --mdc-typography-headline6-font-weight: 400;
        color: var(--app-header-text-color, var(--mdc-theme-on-primary, #fff));
        background-color: var(
          --app-header-background-color,
          var(--mdc-theme-primary)
        );
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-top-app-bar-fixed": HaTopAppBarFixed;
  }
}
