import { TopAppBarBase } from "@material/mwc-top-app-bar/mwc-top-app-bar-base";
import { styles } from "@material/mwc-top-app-bar/mwc-top-app-bar.css";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-top-app-bar")
export class HaTopAppBar extends TopAppBarBase {
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
    "ha-top-app-bar": HaTopAppBar;
  }
}
