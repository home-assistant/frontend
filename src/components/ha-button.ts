import { Button } from "@material/mwc-button";
import { css } from "lit";
import { customElement } from "lit/decorators";
import { styles } from "@material/mwc-button/styles.css";

@customElement("ha-button")
export class HaButton extends Button {
  static override styles = [
    styles,
    css`
      ::slotted([slot="icon"]) {
        margin-inline-start: 0px;
        margin-inline-end: 8px;
        direction: var(--direction);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-button": HaButton;
  }
}
