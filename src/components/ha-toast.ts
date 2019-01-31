import "@polymer/paper-toast/paper-toast";

// tslint:disable-next-line
const PaperToast = customElements.get("paper-toast");

export class HaToast extends PaperToast {
  public connectedCallback() {
    super.connectedCallback();

    if (!this._resizeListener) {
      this._resizeListener = (ev) =>
        this.classList.toggle("fit-bottom", ev.matches);
      this._mediaq = window.matchMedia("(max-width: 599px");
    }
    this._mediaq.addListener(this._resizeListener);
    this._resizeListener(this._mediaq);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._mediaq.removeListener(this._resizeListener);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-toast": HaToast;
  }
}

customElements.define("ha-toast", HaToast);
