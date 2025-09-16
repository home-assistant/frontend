import { Dialog } from "@material/web/dialog/internal/dialog";
import { styles } from "@material/web/dialog/internal/dialog-styles";
import {
  type DialogAnimation,
  DIALOG_DEFAULT_CLOSE_ANIMATION,
  DIALOG_DEFAULT_OPEN_ANIMATION,
} from "@material/web/dialog/internal/animations";
import { css } from "lit";
import { customElement, property } from "lit/decorators";

// workaround to be able to overlay a dialog with another dialog
Dialog.addInitializer(async (instance) => {
  await instance.updateComplete;

  const dialogInstance = instance as HaMdDialog;

  // @ts-expect-error dialog is private
  dialogInstance.dialog.prepend(dialogInstance.scrim);
  // @ts-expect-error scrim is private
  dialogInstance.scrim.style.inset = 0;
  // @ts-expect-error scrim is private
  dialogInstance.scrim.style.zIndex = 0;

  const { getOpenAnimation, getCloseAnimation } = dialogInstance;
  dialogInstance.getOpenAnimation = () => {
    const animations = getOpenAnimation.call(this);
    animations.container = [
      ...(animations.container ?? []),
      ...(animations.dialog ?? []),
    ];
    animations.dialog = [];
    return animations;
  };
  dialogInstance.getCloseAnimation = () => {
    const animations = getCloseAnimation.call(this);
    animations.container = [
      ...(animations.container ?? []),
      ...(animations.dialog ?? []),
    ];
    animations.dialog = [];
    return animations;
  };
});

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let DIALOG_POLYFILL: Promise<typeof import("dialog-polyfill")>;

/**
 * Based on the home assistant design: https://design.home-assistant.io/#components/ha-dialogs
 *
 */
@customElement("ha-md-dialog")
export class HaMdDialog extends Dialog {
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

  private _handleCancel(closeEvent: Event) {
    if (this.disableCancelAction) {
      closeEvent.preventDefault();
      const dialogElement = this.shadowRoot?.querySelector("dialog .container");
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
    styles,
    css`
      :host {
        --md-dialog-container-color: var(--card-background-color);
        --md-dialog-headline-color: var(--primary-text-color);
        --md-dialog-supporting-text-color: var(--primary-text-color);
        --md-sys-color-scrim: #000000;

        --md-dialog-headline-weight: var(--ha-font-weight-normal);
        --md-dialog-headline-size: var(--ha-font-size-xl);
        --md-dialog-supporting-text-size: var(--ha-font-size-m);
        --md-dialog-supporting-text-line-height: var(--ha-line-height-normal);
        --md-divider-color: var(--divider-color);
      }

      :host([type="alert"]) {
        min-width: 320px;
      }

      @media all and (max-width: 450px), all and (max-height: 500px) {
        :host(:not([type="alert"])) {
          min-width: var(--mdc-dialog-min-width, 100vw);
          min-height: 100%;
          max-height: 100%;
          --md-dialog-container-shape: 0;
        }
      }

      ::slotted(ha-dialog-header[slot="headline"]) {
        display: contents;
      }

      slot[name="actions"]::slotted(*) {
        padding: 16px;
      }

      .scroller {
        overflow: var(--dialog-content-overflow, auto);
      }

      slot[name="content"]::slotted(*) {
        padding: var(--dialog-content-padding, 24px);
      }
      .scrim {
        z-index: 10; /* overlay navigation */
      }
    `,
  ];
}

// by default the dialog open/close animation will be from/to the top
// but if we have a special mobile dialog which is at the bottom of the screen, a from bottom animation can be used:
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
