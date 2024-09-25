import { MdDivider } from "@material/web/divider/divider";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-md-divider")
export class HaMdDivider extends MdDivider {
  static override styles = [
    ...super.styles,
    css`
      :host {
        --md-divider-color: var(--divider-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-md-divider": HaMdDivider;
  }
}
