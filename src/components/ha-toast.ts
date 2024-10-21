import { Snackbar } from "@material/mwc-snackbar/mwc-snackbar";
import { styles } from "@material/mwc-snackbar/mwc-snackbar.css";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-toast")
export class HaToast extends Snackbar {
  static override styles = [
    styles,
    css`
      .mdc-snackbar--leading {
        justify-content: center;
      }

      .mdc-snackbar {
        margin: 8px;
        right: calc(8px + env(safe-area-inset-right));
        bottom: calc(8px + env(safe-area-inset-bottom));
        left: calc(8px + env(safe-area-inset-left));
      }

      .mdc-snackbar__surface {
        min-width: 350px;
        max-width: 650px;
      }

      // Revert the default styles set by mwc-snackbar
      @media (max-width: 480px), (max-width: 344px) {
        .mdc-snackbar__surface {
          min-width: inherit;
        }
      }

      @media all and (max-width: 450px), all and (max-height: 500px) {
        .mdc-snackbar {
          right: env(safe-area-inset-right);
          bottom: env(safe-area-inset-bottom);
          left: env(safe-area-inset-left);
        }
        .mdc-snackbar__surface {
          min-width: 100%;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-toast": HaToast;
  }
}
