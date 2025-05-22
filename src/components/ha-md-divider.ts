import { Divider } from "@material/web/divider/internal/divider";
import { styles } from "@material/web/divider/internal/divider-styles";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-md-divider")
export class HaMdDivider extends Divider {
  static override styles = [
    styles,
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
