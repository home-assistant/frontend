import { nothing, html } from "lit";
import { directive, PartType } from "lit/directive.js";
import { AsyncDirective } from "lit/async-directive.js";
import { repeat } from "lit/directives/repeat.js";
import { VirtualScroller } from "./uni-virtualizer/lib/VirtualScroller.js";
export const defaultKeyFunction = (item) => item;
export const defaultRenderItem = (item) =>
  html`${JSON.stringify(item, null, 2)}`;
class ScrollDirective extends AsyncDirective {
  constructor(part) {
    super(part);
    this.container = null;
    this.scroller = null;
    this.first = 0;
    this.last = -1;
    this.renderItem = defaultRenderItem;
    this.keyFunction = defaultKeyFunction;
    this.items = [];
    if (part.type !== PartType.CHILD) {
      throw new Error(
        "The scroll directive can only be used in child expressions"
      );
    }
  }
  render(config) {
    if (config) {
      this.renderItem = config.renderItem || this.renderItem;
      this.keyFunction = config.keyFunction || this.keyFunction;
    }
    const itemsToRender = [];
    if (this.first >= 0 && this.last >= this.first) {
      for (let i = this.first; i < this.last + 1; i++) {
        itemsToRender.push(this.items[i]);
      }
    }
    return repeat(
      itemsToRender,
      this.keyFunction || defaultKeyFunction,
      this.renderItem
    );
  }
  update(part, [config]) {
    var _a;
    if (this.scroller || this._initialize(part, config)) {
      const { scroller } = this;
      this.items = scroller.items = config.items || [];
      scroller.totalItems =
        config.totalItems ||
        ((_a = config.items) === null || _a === void 0 ? void 0 : _a.length) ||
        0;
      scroller.layout = config.layout || null;
      scroller.scrollTarget = config.scrollTarget || this.container;
      if (config.scrollToIndex) {
        scroller.scrollToIndex = config.scrollToIndex;
      }
      return this.render(config);
    }
    return nothing;
  }
  _initialize(part, config) {
    const container = (this.container = part.parentNode);
    if (container && container.nodeType === 1) {
      this.scroller = new VirtualScroller({ container });
      container.addEventListener("rangeChanged", (e) => {
        this.first = e.detail.first;
        this.last = e.detail.last;
        this.setValue(this.render());
      });
      return true;
    }
    // TODO (GN): This seems to be needed in the case where the `scroll`
    // directive is used within the `LitVirtualizer` element. Figure out why
    // and see if there's a cleaner solution.
    Promise.resolve().then(() => this.update(part, [config]));
    return false;
  }
}
export const scroll = directive(ScrollDirective);
//# sourceMappingURL=scroll.js.map
