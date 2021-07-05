var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
          ? (desc = Object.getOwnPropertyDescriptor(target, key))
          : desc,
      d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
  };
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators/custom-element.js";
import { property } from "lit/decorators/property.js";
import { scroll } from "./scroll.js";
import { scrollerRef } from "./uni-virtualizer/lib/VirtualScroller.js";
/**
 * A LitElement wrapper of the scroll directive.
 *
 * Import this module to declare the lit-virtualizer custom element.
 * Pass an items array, renderItem method, and scroll target as properties
 * to the <lit-virtualizer> element.
 */
let LitVirtualizer = class LitVirtualizer extends LitElement {
  constructor() {
    super(...arguments);
    this.items = [];
    this.scrollTarget = this;
    this.keyFunction = undefined;
    this._layout = null;
    this._scrollToIndex = null;
  }
  createRenderRoot() {
    return this;
  }
  // get items() {
  //     return this._items;
  // }
  // set items(items) {
  //     this._items = items;
  //     this._scroller.totalItems = items.length;
  // }
  /**
   * The method used for rendering each item.
   */
  // get renderItem() {
  //     return this._renderItem;
  // }
  // set renderItem(renderItem) {
  //     if (renderItem !== this.renderItem) {
  //         this._renderItem = renderItem;
  //         this.requestUpdate();
  //     }
  // }
  set layout(layout) {
    // TODO (graynorton): Shouldn't have to set this here
    this._layout = layout;
    this.requestUpdate();
  }
  get layout() {
    return this[scrollerRef].layout;
  }
  /**
   * Scroll to the specified index, placing that item at the given position
   * in the scroll view.
   */
  async scrollToIndex(index, position = "start") {
    this._scrollToIndex = { index, position };
    this.requestUpdate();
    await this.updateComplete;
    this._scrollToIndex = null;
  }
  render() {
    const { items, renderItem, keyFunction, scrollTarget } = this;
    const layout = this._layout;
    return html`
      ${scroll({
        items,
        renderItem,
        layout,
        keyFunction,
        scrollTarget,
        scrollToIndex: this._scrollToIndex,
      })}
    `;
  }
};
__decorate([property()], LitVirtualizer.prototype, "renderItem", void 0);
__decorate(
  [property({ attribute: false })],
  LitVirtualizer.prototype,
  "items",
  void 0
);
__decorate(
  [property({ attribute: false })],
  LitVirtualizer.prototype,
  "scrollTarget",
  void 0
);
__decorate([property()], LitVirtualizer.prototype, "keyFunction", void 0);
__decorate(
  [property({ attribute: false })],
  LitVirtualizer.prototype,
  "layout",
  null
);
LitVirtualizer = __decorate([customElement("lit-virtualizer")], LitVirtualizer);
export { LitVirtualizer };
//# sourceMappingURL=lit-virtualizer.js.map
