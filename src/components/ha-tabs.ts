import type { PaperIconButtonElement } from "@polymer/paper-icon-button/paper-icon-button";
import type { PaperTabElement } from "@polymer/paper-tabs/paper-tab";
import "@polymer/paper-tabs/paper-tabs";
import type { PaperTabsElement } from "@polymer/paper-tabs/paper-tabs";
import { customElement } from "lit/decorators";
import type { HomeAssistant, Constructor } from "../types";
import { computeRTLDirection } from "../common/util/compute_rtl";

// eslint-disable-next-line @typescript-eslint/naming-convention
const PaperTabs = customElements.get(
  "paper-tabs"
) as Constructor<PaperTabsElement>;

let subTemplate: HTMLTemplateElement;

@customElement("ha-tabs")
export class HaTabs extends PaperTabs {
  @property({ attribute: false }) public hass!: HomeAssistant;

  private _firstTabWidth = 0;

  private _lastTabWidth = 0;

  private _lastLeftHiddenState = false;

  private _lastRightHiddenState = false;

  static get template(): HTMLTemplateElement {
    if (!subTemplate) {
      subTemplate = (PaperTabs as any).template.cloneNode(true);

      const superStyle = subTemplate.content.querySelector("style");

      // Add "noink" attribute for scroll buttons to disable animation.
      subTemplate.content
        .querySelectorAll("paper-icon-button")
        .forEach((arrow: PaperIconButtonElement) => {
          arrow.setAttribute("noink", "");
        });

      superStyle!.appendChild(
        document.createTextNode(`
          #selectionBar {
            box-sizing: border-box;
          }
          .not-visible {
            display: none;
          }
          paper-icon-button {
            width: 24px;
            height: 48px;
            padding: 0;
            margin: 0;
          }
        `)
      );
    }
    return subTemplate;
  }

  // Get first and last tab's width for _affectScroll
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public _tabChanged(tab: PaperTabElement, old: PaperTabElement): void {
    super._tabChanged(tab, old);
    const tabs = this.querySelectorAll("paper-tab:not(.hide-tab)");
    if (tabs.length > 0) {
      this._firstTabWidth = tabs[0].clientWidth;
      this._lastTabWidth = tabs[tabs.length - 1].clientWidth;
    }

    // Scroll active tab into view if needed.
    const selected = this.querySelector(".iron-selected");
    if (selected) {
      selected.scrollIntoView();
      this._affectScroll(0); // Ensure scroll arrows match scroll position
    }
  }

  /**
   * Modify _affectScroll so that when the scroll arrows appear
   * while scrolling and the tab container shrinks we can counteract
   * the jump in tab position so that the scroll still appears smooth.
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public _affectScroll(dx: number): void {
    if (this._firstTabWidth === 0 || this._lastTabWidth === 0) {
      return;
    }

    this.$.tabsContainer.scrollLeft += dx;

    const scrollLeft = this.$.tabsContainer.scrollLeft;
    const dirRTL = computeRTLDirection(this.hass!) === 'rtl';

    const boolCondition1 = Math.abs(scrollLeft) < this._firstTabWidth;
    const boolCondition2 =
      (Math.abs(scrollLeft) + this._lastTabWidth) > this._tabContainerScrollSize;

    this._leftHidden = !dirRTL ? boolCondition1 : boolCondition2;
    this._rightHidden = !dirRTL ? boolCondition2 : boolCondition1;

    if (!dirRTL) {
      if (this._lastLeftHiddenState !== this._leftHidden) {
        this._lastLeftHiddenState = this._leftHidden;
        this.$.tabsContainer.scrollLeft += this._leftHidden ? -23 : 23;
      }
    } else if (this._lastRightHiddenState !== this._rightHidden) {
      this._lastRightHiddenState = this._rightHidden;
      this.$.tabsContainer.scrollLeft -= this._rightHidden ? -23 : 23;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tabs": HaTabs;
  }
}
