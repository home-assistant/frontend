import { TopAppBarFixedBase } from "@material/mwc-top-app-bar-fixed/mwc-top-app-bar-fixed-base";
import { styles } from "@material/mwc-top-app-bar/mwc-top-app-bar.css";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-top-app-bar-fixed")
export class HaTopAppBarFixed extends TopAppBarFixedBase {
  static override styles = [
    styles,
    css`
      .mdc-top-app-bar__row {
        height: var(--header-height);
      }
      .mdc-top-app-bar--fixed-adjust {
        padding-top: var(--header-height);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-top-app-bar-fixed": HaTopAppBarFixed;
  }
}
