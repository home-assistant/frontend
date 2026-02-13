import { TopAppBarFixedBase } from "@material/mwc-top-app-bar-fixed/mwc-top-app-bar-fixed-base";
import { styles } from "@material/mwc-top-app-bar/mwc-top-app-bar.css";
import { css } from "lit";
import { customElement, property } from "lit/decorators";
import { haTopAppBarFixedSharedStyles } from "./ha-top-app-bar-fixed-shared-styles";

@customElement("ha-top-app-bar-fixed")
export class HaTopAppBarFixed extends TopAppBarFixedBase {
  @property({ type: Boolean, reflect: true }) public narrow = false;

  static override styles = [
    styles,
    haTopAppBarFixedSharedStyles,
    css`
      .mdc-top-app-bar__title {
        font-size: var(--ha-font-size-xl);
        padding-inline-start: var(--ha-space-6);
        padding-inline-end: initial;
      }
      :host([narrow]) .mdc-top-app-bar__title {
        padding-inline-start: var(--ha-space-2);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-top-app-bar-fixed": HaTopAppBarFixed;
  }
}
