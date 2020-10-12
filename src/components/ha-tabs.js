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
          .not-visible {
            display: none;
          }
        `)
      );
    }
    return subTemplate;
  }

  ready() {
    super.ready();

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

  // Get first and last tab's width for _affectScroll
  _tabChanged(tab, old) {
    super._tabChanged(tab, old);
    this.firstTabWidth = this.firstElementChild.clientWidth;
    this.lastTabWidth = this.lastElementChild.clientWidth;
  }

  /**
   * Modify _affectScroll so that when the scroll arrows appear
   * while scrolling and the tab container shrinks we can counteract
   * the jump in tab position so that the scroll still appears smooth.
   */
  _affectScroll(dx) {
    this.$.tabsContainer.scrollLeft += dx;

    const scrollLeft = this.$.tabsContainer.scrollLeft;

    this._leftHidden = scrollLeft - this.firstTabWidth < 0;
    this._rightHidden =
      scrollLeft + this.lastTabWidth > this._tabContainerScrollSize;

    if (this._lastLeftHiddenState !== this._leftHidden) {
      this._lastLeftHiddenState = this._leftHidden;
      this.$.tabsContainer.scrollLeft += this._leftHidden ? -54 : 54;
    }
  }
}
customElements.define("ha-tabs", HaTabs);
