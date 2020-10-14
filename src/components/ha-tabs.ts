import "@polymer/paper-tabs";
import { customElement, property } from "lit-element";
import { PaperTabsElement } from "@polymer/paper-tabs/paper-tabs";
import { Constructor } from "../types";

const PaperTabs = customElements.get("paper-tabs") as Constructor<
  PaperTabsElement
>;

let subTemplate;

@customElement("ha-tabs")
export class HaTabs extends PaperTabs {
  private _firstTabWidth = 0;

  private _lastTabWidth = 0;

  private _lastLeftHiddenState = false;

  static get template() {
    if (!subTemplate) {
      subTemplate = PaperTabs.template.cloneNode(true);

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
  public _tabChanged(tab, old) {
    super._tabChanged(tab, old);
    const tabs = this.querySelectorAll("paper-tab:not(.hide-tab)");
    if (tabs.length) {
      this.firstTabWidth = tabs[0].clientWidth;
      this.lastTabWidth = tabs[tabs.length - 1].clientWidth;
    }

    // Scroll active tab into view if needed.
    const selected = this.querySelector(".iron-selected");
    if (selected) {
      selected.scrollIntoView();
    }
  }

  /**
   * Modify _affectScroll so that when the scroll arrows appear
   * while scrolling and the tab container shrinks we can counteract
   * the jump in tab position so that the scroll still appears smooth.
   */
  public _affectScroll(dx: number):void {
    if (!this.firstTabWidth || !this.lastTabWidth) {
      return;
    }

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

declare global {
  interface HTMLElementTagNameMap {
    "ha-tabs": HaTabs;
  }
}
