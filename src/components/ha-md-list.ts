import { MdList } from "@material/web/list/list";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-md-list")
export class HaMdList extends MdList {
  static override styles = [
    ...super.styles,
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
