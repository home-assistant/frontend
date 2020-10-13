import "@polymer/paper-tabs";

const PaperTabsClass = customElements.get("paper-tabs");
let subTemplate;

class HaTabs extends PaperTabsClass {
  static get template() {
    if (!subTemplate) {
      subTemplate = PaperTabsClass.template.cloneNode(true);

      const superStyle = subTemplate.content.querySelector("style");

      [...subTemplate.content.querySelectorAll("paper-icon-button")].forEach(
        (arrow) => {
          arrow.setAttribute("noink", "");
        }
      );

      superStyle.appendChild(
        document.createTextNode(`
          .not-visible {
            display: none;
          }
          :host > paper-icon-button:first-of-type {
            padding-left: 0;
          }
          paper-icon-button {
            margin: 0 -8px 0 0;
          }
        `)
      );
    }
    return subTemplate;
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
      this.$.tabsContainer.scrollLeft += this._leftHidden ? -46 : 46;
    }
  }
}
customElements.define("ha-tabs", HaTabs);
