import { List } from "@material/web/list/internal/list";
import { styles } from "@material/web/list/internal/list-styles";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-md-list")
export class HaMdList extends List {
  static override styles = [
    styles,
    css`
      :host {
        --md-sys-color-surface: var(--card-background-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-md-list": HaMdList;
  }
}
