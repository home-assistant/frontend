import { MdDivider } from "@material/web/divider/divider";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-divider")
export class HaDivider extends MdDivider {
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
    "ha-divider": HaDivider;
  }
}
