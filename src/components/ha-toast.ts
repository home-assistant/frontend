import { customElement } from "lit/decorators";
import { Snackbar } from "@material/mwc-snackbar/mwc-snackbar";

@customElement("ha-toast")
export class HaToast extends Snackbar {}

declare global {
  interface HTMLElementTagNameMap {
    "ha-toast": HaToast;
  }
}
