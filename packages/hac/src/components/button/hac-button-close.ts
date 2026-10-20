import { css, html } from "lit";
import { HacButton } from "./hac-button";

// mdiClose from Material Design Icons (Apache-2.0)
const CLOSE_ICON =
  "M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z";

/**
 * Icon button with a close icon.
 *
 * The accessible label defaults to "Close". Set `label` to a translated
 * text when the page is not in English.
 *
 * Importing this module does not register the element. Use
 * `@home-assistant/hac/button` to register `<hac-button-close>` globally, or
 * the `scoped` and `dynamic` entry points next to it.
 *
 * @csspart base - The native button.
 * @cssprop --hac-button-color - Icon color.
 * @cssprop --hac-button-height - Width and height.
 */
export class HacButtonClose extends HacButton {
  constructor() {
    super();
    this.appearance = "plain";
  }

  protected get accessibleLabel() {
    return this.label ?? "Close";
  }

  protected renderContent() {
    return html`
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d=${CLOSE_ICON}></path>
      </svg>
    `;
  }

  static styles = [
    HacButton.styles,
    css`
      :host([appearance="plain"]) {
        --_color: var(--hac-button-color, var(--secondary-text-color, #727272));
      }

      button {
        width: var(--hac-button-height, 40px);
        padding: 0;
        border-radius: 50%;
      }

      svg {
        width: 24px;
        height: 24px;
        fill: currentColor;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hac-button-close": HacButtonClose;
  }
}
