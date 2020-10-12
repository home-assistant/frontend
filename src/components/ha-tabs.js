import "@polymer/paper-tabs";

const PaperTabsClass = customElements.get("paper-tabs");
let subTemplate;

class HaTabs extends PaperTabsClass {
  static get template() {
    if (!subTemplate) {
      subTemplate = PaperTabsClass.template.cloneNode(true);

      const superStyle = subTemplate.content.querySelector("style");

      superStyle.appendChild(
        document.createTextNode(`
          .hidden, .not-visible {
            display: none;
          }
        `)
      );
    }
    return subTemplate;
  }

  ready() {
    super.ready();
    this.setScrollDirection("y", this.$.tabsContainer);

    this.addEventListener("mousewheel", (e) => {
      if (e.wheelDelta > 0) {
        this._scrollToRight();
      } else if (e.wheelDelta < 0) {
        this._scrollToLeft();
      } else {
        return;
      }
      e.preventDefault();
    });
  }

  _affectScroll(dx) {
    super._affectScroll(dx);
    this.$.tabsContainer.scrollLeft += dx;

    const scrollLeft = this.$.tabsContainer.scrollLeft;

    this._leftHidden = scrollLeft - this.firstElementChild.clientWidth < 0;
    this._rightHidden =
      scrollLeft + this.lastElementChild.clientWidth >
      this._tabContainerScrollSize;

    if (this._lastLeftHiddenState !== this._leftHidden) {
      this._lastLeftHiddenState = this._leftHidden;
      this.$.tabsContainer.scrollLeft += this._leftHidden ? -54 : 54;
    }
  }
}
customElements.define("ha-tabs", HaTabs);
