import "@polymer/paper-toast/paper-toast";
import type { PaperToastElement } from "@polymer/paper-toast/paper-toast";
import type { Constructor } from "../types";

const PaperToast = customElements.get(
  "paper-toast"
) as Constructor<PaperToastElement>;

export class HaToast extends PaperToast {
  private _resizeListener?: (obj: { matches: boolean }) => unknown;

  private _mediaq?: MediaQueryList;

  public connectedCallback() {
    super.connectedCallback();

    if (!this._resizeListener) {
      this._resizeListener = (ev) =>
        this.classList.toggle("fit-bottom", ev.matches);
      this._mediaq = window.matchMedia("(max-width: 599px");
    }
    this._mediaq!.addListener(this._resizeListener);
    this._resizeListener(this._mediaq!);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._mediaq!.removeListener(this._resizeListener!);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-toast": HaToast;
  }
}

customElements.define("ha-toast", HaToast);
