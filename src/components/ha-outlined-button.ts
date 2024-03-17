import { css } from "lit";
import { customElement } from "lit/decorators";
import "element-internals-polyfill";
import { MdOutlinedButton } from "@material/web/button/outlined-button";

@customElement("ha-outlined-button")
export class HaOutlinedButton extends MdOutlinedButton {
  static override styles = [
    ...super.styles,
    css`
      :host {
        --ha-icon-display: block;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-outlined-button": HaOutlinedButton;
  }
}
