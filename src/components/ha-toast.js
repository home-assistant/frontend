import "@polymer/paper-toast/paper-toast";

const PaperToast = customElements.get("paper-toast");

class HaToast extends PaperToast {
  connectedCallback() {
    super.connectedCallback();

    if (!this._resizeListener) {
      this._resizeListener = (ev) =>
        this.classList.toggle("fit-bottom", ev.matches);
      this._mediaq = window.matchMedia("(max-width: 599px");
    }
    this._mediaq.addListener(this._resizeListener);
    this._resizeListener(this._mediaq);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._mediaq.removeListener(this._resizeListener);
  }
}

customElements.define("ha-toast", HaToast);
