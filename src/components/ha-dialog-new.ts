import { MdDialog } from "@material/web/dialog/dialog";
import { css } from "lit";
import { customElement, property } from "lit/decorators";

// export const fireCloseEvent = (node) => {
//   fireEvent(node, "close");
// };

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
    }
  }

  static override styles = [
    ...super.styles,
    css`
      :host {
        --md-dialog-container-color: var(--card-background-color);
        --md-dialog-headline-color: var(--primary-text-color);

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
      .scrim {
        background-color: var(--secondary-background-color);
        /* background-color: rgba(0, 0, 0, 0.32); */
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
