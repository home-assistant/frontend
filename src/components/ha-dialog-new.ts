import { MdDialog } from "@material/web/dialog/dialog";
import { css } from "lit";
import { customElement, property } from "lit/decorators";

/**
 * Based on the home assistant design: https://design.home-assistant.io/#components/ha-dialogs
 *
 */
@customElement("ha-dialog-new")
export class HaDialogNew extends MdDialog {
  /**
   * When true the dialog will not close when the user presses the esc key or press out of the dialog.
   */
  @property({ attribute: "disable-esc-scrim-cancel", type: Boolean })
  public disableEscScrimCancel = false;

  constructor() {
    super();
    this.open = true;
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("cancel", this._handleCancel);
  }

  _handleCancel(closeEvent: Event) {
    if (this.disableEscScrimCancel) {
      closeEvent.preventDefault();
      const dialogElement = this.shadowRoot?.querySelector("dialog");
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

  static override styles = [
    ...super.styles,
    css`
      :host {
        --md-dialog-container-color: var(--card-background-color);
        --md-dialog-headline-color: var(--primary-text-color);
        --md-sys-color-scrim: #000000;

        --md-dialog-headline-weight: 400;
        --md-dialog-headline-size: 1.574rem;
        --md-dialog-supporting-text-size: 1rem;

        @media all and (max-width: 450px), all and (max-height: 500px) {
          min-width: calc(
            100vw - env(safe-area-inset-right) - env(safe-area-inset-left)
          );
          max-width: calc(
            100vw - env(safe-area-inset-right) - env(safe-area-inset-left)
          );
          min-height: 100%;
          max-height: 100%;
          border-radius: 0;
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

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-new": HaDialogNew;
  }
}
