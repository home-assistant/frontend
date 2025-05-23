import { TopAppBarFixedBase } from "@material/mwc-top-app-bar-fixed/mwc-top-app-bar-fixed-base";
import { styles } from "@material/mwc-top-app-bar/mwc-top-app-bar.css";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-top-app-bar-fixed")
export class HaTopAppBarFixed extends TopAppBarFixedBase {
  static override styles = [
    styles,
    css`
      header {
        padding-top: var(--safe-area-inset-top);
      }
      .mdc-top-app-bar__row {
        height: var(--header-height);
        padding-left: var(--safe-area-content-inset-left);
        padding-right: var(--safe-area-content-inset-right);
        border-bottom: var(--app-header-border-bottom);
      }
      .mdc-top-app-bar--fixed-adjust {
        padding-top: calc(var(--safe-area-inset-top) + var(--header-height));
      }
      .mdc-top-app-bar {
        --mdc-typography-headline6-font-weight: var(--ha-font-weight-normal);
        color: var(--app-header-text-color, var(--mdc-theme-on-primary, #fff));
        background-color: var(
          --app-header-background-color,
          var(--mdc-theme-primary)
        );
      }
      .mdc-top-app-bar__title {
        font-size: var(--ha-font-size-xl);
        padding-inline-start: 24px;
        padding-inline-end: initial;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-top-app-bar-fixed": HaTopAppBarFixed;
  }
}
