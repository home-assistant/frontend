import { MdTextButton } from "@material/web/button/text-button";
import { css } from "lit";
import { customElement } from "lit/decorators";

declare global {
  interface HTMLElementTagNameMap {
    "ha-text-button": HaTextButton;
  }
}

@customElement("ha-text-button")
export class HaTextButton extends MdTextButton {
  static override styles = [
    ...MdTextButton.styles,
    css`
      :host {
        --md-sys-color-on-surface: var(--primary-text-color);
        --md-sys-color-primary: var(--primary-color);
        --md-sys-color-surface: var(--card-background-color);
      }
    `,
  ];
}
