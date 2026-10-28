import type { CSSResultGroup } from "lit";
import { css } from "lit";
import { customElement } from "lit/decorators";
import { HaIconButton } from "./ha-icon-button";

/**
 * @element ha-outlined-icon-button
 * @extends {HaIconButton}
 *
 * @summary
 * Icon button with a circular outline.
 *
 * @cssprop --ha-icon-button-size - Size of the button. Defaults to `40px`.
 * @cssprop --ha-outlined-icon-button-outline-color - Color of the outline. Defaults to `--secondary-text-color`.
 */
@customElement("ha-outlined-icon-button")
export class HaOutlinedIconButton extends HaIconButton {
  static styles: CSSResultGroup = [
    HaIconButton.styles,
    css`
      :host {
        color: var(--secondary-text-color);
        --ha-button-height: var(--ha-icon-button-size, 40px);
      }
      ha-button::part(base) {
        box-sizing: border-box;
        border: 1px solid
          var(
            --ha-outlined-icon-button-outline-color,
            var(--secondary-text-color)
          );
        border-radius: 50%;
      }
      :host([disabled]) ha-button::part(base) {
        border-color: var(--ha-color-on-disabled-quiet);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-outlined-icon-button": HaOutlinedIconButton;
  }
}
