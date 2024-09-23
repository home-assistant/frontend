import { MdFilledTonalButton } from "@material/web/button/filled-tonal-button";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-filled-tonal-button")
export class HaFilledTonalButton extends MdFilledTonalButton {
  static override styles = [
    ...super.styles,
    css`
      :host {
        --md-filled-tonal-button-label-text-color: var(--primary-color);
        --md-filled-tonal-button-hover-label-text-color: var(--primary-color);
        --md-filled-tonal-button-pressed-label-text-color: var(--primary-color);
        --md-filled-tonal-button-container-color: var(
          --secondary-background-color
        );
        --md-filled-tonal-button-container-shadow-color: var(
          --card-background-color
        );

        .label {
          letter-spacing: 0.0892857143em;
          text-transform: uppercase;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filled-tonal-button": HaFilledTonalButton;
  }
}
