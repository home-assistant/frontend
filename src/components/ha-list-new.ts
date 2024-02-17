import { customElement } from "lit/decorators";
import "element-internals-polyfill";
import { MdList } from "@material/web/list/list";
import { CSSResult, css } from "lit";

@customElement("ha-list-new")
export class HaListNew extends MdList {
  static get styles(): CSSResult[] {
    return [
      ...MdList.styles,
      css`
        :host {
          --md-sys-color-surface: var(--card-background-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-list-new": HaListNew;
  }
}
