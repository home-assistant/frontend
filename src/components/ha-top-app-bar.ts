import { TopAppBarBase } from "@material/mwc-top-app-bar/mwc-top-app-bar-base";
import { styles } from "@material/mwc-top-app-bar/mwc-top-app-bar.css";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-top-app-bar")
export class HaTopAppBar extends TopAppBarBase {
  static override styles = [
    styles,
    css`
      header {
        padding-top: var(--safe-area-inset-top);
        /* TODO right padding */
      }
      .mdc-top-app-bar__row {
        height: var(--header-height);
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
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-top-app-bar": HaTopAppBar;
  }
}
