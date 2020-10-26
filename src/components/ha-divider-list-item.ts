import { ListItem } from "@material/mwc-list/mwc-list-item";
import { css, CSSResult, customElement } from "lit-element";

@customElement("ha-divider-list-item")
export class HaDividerListItem extends ListItem {
  noninteractive = true;

  static get styles(): CSSResult[] {
    return [
      super.styles,
      css`
        :host {
          height: var(--ha-divider-height, 48px);
          border: 1px solid black;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-divider-list-item": HaDividerListItem;
  }
}
