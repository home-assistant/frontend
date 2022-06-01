import { ListItemBase } from "@material/mwc-list/mwc-list-item-base";
import { styles } from "@material/mwc-list/mwc-list-item.css";
import { css, CSSResult } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-list-item")
export class HaListItem extends ListItemBase {
  // property used only in css
  @property({ type: Boolean, reflect: true }) public rtl = false;

  static get styles(): CSSResult[] {
    return [
      styles,
      css`
        :host {
          padding-left: 0px;
          padding-right: 0px;
        }
        :host([graphic="avatar"]:not([twoLine])),
        :host([graphic="icon"]:not([twoLine])) {
          height: 48px;
        }
        span.material-icons:first-of-type {
          margin-inline-start: 0px !important;
          margin-inline-end: var(
            --mdc-list-item-graphic-margin,
            16px
          ) !important;
          direction: var(--direction);
        }
        span.material-icons:last-of-type {
          margin-inline-start: auto !important;
          margin-inline-end: 0px !important;
          direction: var(--direction);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-list-item": HaListItem;
  }
}
