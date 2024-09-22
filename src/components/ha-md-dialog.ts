import { MdDialog } from "@material/web/dialog/dialog";
import {
  type DialogAnimation,
  DIALOG_DEFAULT_CLOSE_ANIMATION,
  DIALOG_DEFAULT_OPEN_ANIMATION,
} from "@material/web/dialog/internal/animations";
import { css } from "lit";
import { customElement, property } from "lit/decorators";

let DIALOG_POLYFILL: Promise<typeof import("dialog-polyfill")>;

/**
 * Based on the home assistant design: https://design.home-assistant.io/#components/ha-dialogs
 *
 */
@customElement("ha-md-dialog")
export class HaMdDialog extends MdDialog {
  /**
   * When true the dialog will not close when the user presses the esc key or press out of the dialog.
   */
  @property({ attribute: "disable-cancel-action", type: Boolean })
  public disableCancelAction = false;

  private _polyfillDialogRegistered = false;

  constructor() {
    super();

    this.addEventListener("cancel", this._handleCancel);

    if (typeof HTMLDialogElement !== "function") {
      this.addEventListener("open", this._handleOpen);

      if (!DIALOG_POLYFILL) {
        DIALOG_POLYFILL = import("dialog-polyfill");
      }
    }

    // if browser doesn't support animate API disable open/close animations
    if (this.animate === undefined) {
      this.quick = true;
    }
  }

  // prevent open in older browsers and wait for polyfill to load
  private async _handleOpen(openEvent: Event) {
    openEvent.preventDefault();

    if (this._polyfillDialogRegistered) {
      return;
    }

    this._polyfillDialogRegistered = true;
    this._loadPolyfillStylesheet("/static/polyfills/dialog-polyfill.css");
    const dialog = this.shadowRoot?.querySelector(
      "dialog"
    ) as HTMLDialogElement;

    const dialogPolyfill = await DIALOG_POLYFILL;
    dialogPolyfill.default.registerDialog(dialog);
    this.removeEventListener("open", this._handleOpen);

    this.show();
  }

  private async _loadPolyfillStylesheet(href) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;

    return new Promise<void>((resolve, reject) => {
      link.onload = () => resolve();
      link.onerror = () =>
        reject(new Error(`Stylesheet failed to load: ${href}`));

      this.shadowRoot?.appendChild(link);
    });
  }

  _handleCancel(closeEvent: Event) {
    if (this.disableCancelAction) {
      closeEvent.preventDefault();
      const dialogElement = this.shadowRoot?.querySelector("dialog");
      if (this.animate !== undefined) {
        dialogElement?.animate(
          [
            {
              transform: "rotate(-1deg)",
              "animation-timing-function": "ease-in",
            },
            {
              transform: "rotate(1.5deg)",
              "animation-timing-function": "ease-out",
            },
            {
              transform: "rotate(0deg)",
              "animation-timing-function": "ease-in",
            },
          ],
          {
            duration: 200,
            iterations: 2,
          }
        );
      }
    }
  }

  static override styles = [
    ...super.styles,
    css`
      :host {
        --md-dialog-container-color: var(--card-background-color);
        --md-dialog-headline-color: var(--primary-text-color);
        --md-dialog-supporting-text-color: var(--primary-text-color);
        --md-sys-color-scrim: #000000;

        --md-dialog-headline-weight: 400;
        --md-dialog-headline-size: 1.574rem;
        --md-dialog-supporting-text-size: 1rem;
        --md-dialog-supporting-text-line-height: 1.5rem;
      }

      :host([type="alert"]) {
        max-width: 320px;
        min-width: 320px;
      }

      :host(:not([type="alert"])) {
        @media all and (max-width: 450px), all and (max-height: 500px) {
          min-width: calc(
            100vw - env(safe-area-inset-right) - env(safe-area-inset-left)
          );
          max-width: calc(
            100vw - env(safe-area-inset-right) - env(safe-area-inset-left)
          );
          min-height: 100%;
          max-height: 100%;
          --md-dialog-container-shape: 0;
        }
      }

      :host ::slotted(ha-dialog-header) {
        display: contents;
      }

      .scrim {
        z-index: 10; // overlay navigation
      }
    `,
  ];
}

// by default the dialog open/close animation will be from/to the top
// but if we have a special mobile dialog which is at the bottom of the screen, an from bottom animation can be used:
const OPEN_FROM_BOTTOM_ANIMATION: DialogAnimation = {
  ...DIALOG_DEFAULT_OPEN_ANIMATION,
  dialog: [
    [
      // Dialog slide up
      [{ transform: "translateY(50px)" }, { transform: "translateY(0)" }],
      { duration: 500, easing: "cubic-bezier(.3,0,0,1)" },
    ],
  ],
  container: [
    [
      // Container fade in
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 50, easing: "linear", pseudoElement: "::before" },
    ],
  ],
};

const CLOSE_TO_BOTTOM_ANIMATION: DialogAnimation = {
  ...DIALOG_DEFAULT_CLOSE_ANIMATION,
  dialog: [
    [
      // Dialog slide down
      [{ transform: "translateY(0)" }, { transform: "translateY(50px)" }],
      { duration: 150, easing: "cubic-bezier(.3,0,0,1)" },
    ],
  ],
  container: [
    [
      // Container fade out
      [{ opacity: "1" }, { opacity: "0" }],
      { delay: 100, duration: 50, easing: "linear", pseudoElement: "::before" },
    ],
  ],
};

export const getMobileOpenFromBottomAnimation = () => {
  const matches = window.matchMedia(
    "all and (max-width: 450px), all and (max-height: 500px)"
  ).matches;
  return matches ? OPEN_FROM_BOTTOM_ANIMATION : DIALOG_DEFAULT_OPEN_ANIMATION;
};

export const getMobileCloseToBottomAnimation = () => {
  const matches = window.matchMedia(
    "all and (max-width: 450px), all and (max-height: 500px)"
  ).matches;
  return matches ? CLOSE_TO_BOTTOM_ANIMATION : DIALOG_DEFAULT_CLOSE_ANIMATION;
};

declare global {
  interface HTMLElementTagNameMap {
    "ha-md-dialog": HaMdDialog;
  }
}
