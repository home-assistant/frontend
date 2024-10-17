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
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-toast": HaToast;
  }
}
