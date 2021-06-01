import getResizeObserver from "./polyfillLoaders/ResizeObserver.js";
export const scrollerRef = Symbol("scrollerRef");
/**
 * Provides virtual scrolling boilerplate.
 *
 * Extensions of this class must set container, layout, and scrollTarget.
 *
 * Extensions of this class must also override VirtualRepeater's DOM
 * manipulation methods.
 */
export class VirtualScroller {
  constructor(config) {
    this._benchmarkStart = null;
    /**
     * Whether the layout should receive an updated viewport size on the next
     * render.
     */
    // private _needsUpdateView: boolean = false;
    this._layout = null;
    /**
     * The element that generates scroll events and defines the container
     * viewport. Set by scrollTarget.
     */
    this._scrollTarget = null;
    /**
     * A sentinel element that sizes the container when it is a scrolling
     * element. This ensures the scroll bar accurately reflects the total
     * size of the list.
     */
    this._sizer = null;
    /**
     * Layout provides these values, we set them on _render().
     * TODO @straversi: Can we find an XOR type, usable for the key here?
     */
    this._scrollSize = null;
    /**
     * Difference between scroll target's current and required scroll offsets.
     * Provided by layout.
     */
    this._scrollErr = null;
    /**
     * A list of the positions (top, left) of the children in the current range.
     */
    this._childrenPos = null;
    // TODO: (graynorton): type
    this._childMeasurements = null;
    this._toBeMeasured = new Map();
    this._rangeChanged = true;
    this._itemsChanged = true;
    this._visibilityChanged = true;
    /**
     * Containing element. Set by container.
     */
    this._container = null;
    /**
     * The parent of all child nodes to be rendered. Set by container.
     */
    this._containerElement = null;
    /**
     * Keep track of original inline style of the container, so it can be
     * restored when container is changed.
     */
    this._containerInlineStyle = null;
    /**
     * Size of the container.
     */
    this._containerSize = null;
    /**
     * Resize observer attached to container.
     */
    this._containerRO = null;
    /**
     * Resize observer attached to children.
     */
    this._childrenRO = null;
    this._mutationObserver = null;
    this._mutationPromise = null;
    this._mutationPromiseResolver = null;
    this._mutationsObserved = false;
    // TODO (graynorton): Rethink, per longer comment below
    this._loadListener = this._childLoaded.bind(this);
    /**
     * Index and position of item to scroll to.
     */
    this._scrollToIndex = null;
    /**
     * Items to render. Set by items.
     */
    this._items = [];
    /**
     * Total number of items to render. Set by totalItems.
     */
    this._totalItems = null;
    /**
     * Index of the first child in the range, not necessarily the first visible child.
     * TODO @straversi: Consider renaming these.
     */
    this._first = 0;
    /**
     * Index of the last child in the range.
     */
    this._last = 0;
    /**
     * Index of the first item intersecting the container element.
     */
    this._firstVisible = 0;
    /**
     * Index of the last item intersecting the container element.
     */
    this._lastVisible = 0;
    this._scheduled = new WeakSet();
    /**
     * Invoked at the end of each render cycle: children in the range are
     * measured, and their dimensions passed to this callback. Use it to layout
     * children as needed.
     */
    this._measureCallback = null;
    this._measureChildOverride = null;
    this._first = -1;
    this._last = -1;
    if (config) {
      Object.assign(this, config);
    }
  }
  set items(items) {
    if (Array.isArray(items) && items !== this._items) {
      this._itemsChanged = true;
      this._items = items;
      this._schedule(this._updateLayout);
    }
  }
  /**
   * The total number of items, regardless of the range, that can be rendered
   * as child nodes.
   */
  get totalItems() {
    return this._totalItems === null ? this._items.length : this._totalItems;
  }
  set totalItems(num) {
    if (typeof num !== "number" && num !== null) {
      throw new Error("New value must be a number.");
    }
    // TODO(valdrin) should we check if it is a finite number?
    // Technically, Infinity would break Layout, not VirtualRepeater.
    if (num !== this._totalItems) {
      this._totalItems = num;
      this._schedule(this._updateLayout);
    }
  }
  /**
   * The parent of all child nodes to be rendered.
   */
  get container() {
    return this._container;
  }
  set container(container) {
    if (container === this._container) {
      return;
    }
    if (this._container) {
      // Remove children from old container.
      // TODO (graynorton): Decide whether we'd rather fire an event to clear
      // the range and let the renderer take care of removing the DOM children
      this._children.forEach((child) => child.parentNode.removeChild(child));
    }
    this._container = container;
    this._schedule(this._updateLayout);
    this._initResizeObservers().then(() => {
      const oldEl = this._containerElement;
      // Consider document fragments as shadowRoots.
      const newEl =
        container && container.nodeType === Node.DOCUMENT_FRAGMENT_NODE
          ? container.host
          : container;
      if (oldEl === newEl) {
        return;
      }
      this._containerRO.disconnect();
      this._containerSize = null;
      if (oldEl) {
        if (this._containerInlineStyle) {
          oldEl.setAttribute("style", this._containerInlineStyle);
        } else {
          oldEl.removeAttribute("style");
        }
        this._containerInlineStyle = null;
        if (oldEl === this._scrollTarget) {
          oldEl.removeEventListener("scroll", this, { passive: true });
          this._sizer && this._sizer.remove();
        }
        oldEl.removeEventListener("load", this._loadListener, true);
        this._mutationObserver.disconnect();
      } else {
        // First time container was setup, add listeners only now.
        addEventListener("scroll", this, { passive: true });
      }
      this._containerElement = newEl;
      if (newEl) {
        this._containerInlineStyle = newEl.getAttribute("style") || null;
        // https://github.com/PolymerLabs/uni-virtualizer/issues/104
        // Would rather set these CSS properties on the host using Shadow Root
        // style scoping (and fall back to a global stylesheet where native
        // Shadow DOM is not available), but this Mobile Safari bug is preventing
        // that from working: https://bugs.webkit.org/show_bug.cgi?id=226195
        const style = newEl.style;
        style.display = style.display || "block";
        style.position = style.position || "relative";
        style.overflow = style.overflow || "auto";
        style.contain = style.contain || "strict";
        if (newEl === this._scrollTarget) {
          this._sizer = this._sizer || this._createContainerSizer();
          this._container.insertBefore(this._sizer, this._container.firstChild);
        }
        this._schedule(this._updateLayout);
        this._containerRO.observe(newEl);
        this._mutationObserver.observe(newEl, { childList: true });
        this._mutationPromise = new Promise(
          (resolve) => (this._mutationPromiseResolver = resolve)
        );
        if (this._layout && this._layout.listenForChildLoadEvents) {
          newEl.addEventListener("load", this._loadListener, true);
        }
      }
    });
  }
  // This will always actually return a layout instance,
  // but TypeScript wants the getter and setter types to be the same
  get layout() {
    return this._layout;
  }
  set layout(layout) {
    if (this._layout === layout) {
      return;
    }
    let _layout = null;
    let _config = {};
    if (typeof layout === "object") {
      if (layout.type !== undefined) {
        _layout = layout.type;
        // delete (layout as LayoutSpecifier).type;
      }
      _config = layout;
    } else {
      _layout = layout;
    }
    if (typeof _layout === "function") {
      if (this._layout instanceof _layout) {
        if (_config) {
          this._layout.config = _config;
        }
        return;
      } else {
        _layout = new _layout(_config);
      }
    }
    if (this._layout) {
      this._measureCallback = null;
      this._measureChildOverride = null;
      this._layout.removeEventListener("scrollsizechange", this);
      this._layout.removeEventListener("scrollerrorchange", this);
      this._layout.removeEventListener("itempositionchange", this);
      this._layout.removeEventListener("rangechange", this);
      delete this.container[scrollerRef];
      this.container.removeEventListener("load", this._loadListener, true);
      // Reset container size so layout can get correct viewport size.
      if (this._containerElement) {
        this._sizeContainer(undefined);
      }
    }
    this._layout = _layout;
    if (this._layout) {
      if (
        this._layout.measureChildren &&
        typeof this._layout.updateItemSizes === "function"
      ) {
        if (typeof this._layout.measureChildren === "function") {
          this._measureChildOverride = this._layout.measureChildren;
        }
        this._measureCallback = this._layout.updateItemSizes.bind(this._layout);
      }
      this._layout.addEventListener("scrollsizechange", this);
      this._layout.addEventListener("scrollerrorchange", this);
      this._layout.addEventListener("itempositionchange", this);
      this._layout.addEventListener("rangechange", this);
      this._container[scrollerRef] = this;
      if (this._layout.listenForChildLoadEvents) {
        this._container.addEventListener("load", this._loadListener, true);
      }
      this._schedule(this._updateLayout);
    }
  }
  // TODO (graynorton): Rework benchmarking so that it has no API and
  // instead is always on except in production builds
  startBenchmarking() {
    if (this._benchmarkStart === null) {
      this._benchmarkStart = window.performance.now();
    }
  }
  stopBenchmarking() {
    if (this._benchmarkStart !== null) {
      const now = window.performance.now();
      const timeElapsed = now - this._benchmarkStart;
      const entries = performance.getEntriesByName(
        "uv-virtualizing",
        "measure"
      );
      const virtualizationTime = entries
        .filter((e) => e.startTime >= this._benchmarkStart && e.startTime < now)
        .reduce((t, m) => t + m.duration, 0);
      this._benchmarkStart = null;
      return { timeElapsed, virtualizationTime };
    }
    return null;
  }
  _measureChildren() {
    const mm = {};
    const children = this._children;
    const fn = this._measureChildOverride || this._measureChild;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const idx = this._first + i;
      if (this._itemsChanged || this._toBeMeasured.has(child)) {
        mm[idx] = fn.call(
          this,
          child,
          this._items[idx] /*as unknown as object*/
        );
      }
    }
    this._childMeasurements = mm;
    this._schedule(this._updateLayout);
    this._toBeMeasured.clear();
  }
  /**
   * Returns the width, height, and margins of the given child.
   */
  _measureChild(element) {
    // offsetWidth doesn't take transforms in consideration, so we use
    // getBoundingClientRect which does.
    const { width, height } = element.getBoundingClientRect();
    return Object.assign({ width, height }, getMargins(element));
  }
  /**
   * The element that generates scroll events and defines the container
   * viewport. The value `null` (default) corresponds to `window` as scroll
   * target.
   */
  get scrollTarget() {
    return this._scrollTarget;
  }
  set scrollTarget(target) {
    // Consider window as null.
    if (target === window) {
      target = null;
    }
    if (this._scrollTarget === target) {
      return;
    }
    this._sizeContainer(undefined);
    if (this._scrollTarget) {
      this._scrollTarget.removeEventListener("scroll", this, { passive: true });
      if (this._sizer && this._scrollTarget === this._containerElement) {
        this._sizer.remove();
      }
    }
    this._scrollTarget = target;
    if (target) {
      target.addEventListener("scroll", this, { passive: true });
      if (target === this._containerElement) {
        this._sizer = this._sizer || this._createContainerSizer();
        this._container.insertBefore(this._sizer, this._container.firstChild);
      }
    }
  }
  /**
   * Index and position of item to scroll to. The scroller will fix to that point
   * until the user scrolls.
   */
  set scrollToIndex(newValue) {
    this._scrollToIndex = newValue;
    this._schedule(this._updateLayout);
  }
  async _schedule(method) {
    if (!this._scheduled.has(method)) {
      this._scheduled.add(method);
      await Promise.resolve();
      this._scheduled.delete(method);
      method.call(this);
    }
  }
  async _updateDOM() {
    const { _rangeChanged, _itemsChanged } = this;
    if (this._visibilityChanged) {
      this._notifyVisibility();
      this._visibilityChanged = false;
    }
    if (_rangeChanged || _itemsChanged) {
      this._notifyRange();
      this._rangeChanged = false;
      this._itemsChanged = false;
      await this._mutationPromise;
    }
    if (this._layout.measureChildren) {
      this._children.forEach((child) => this._childrenRO.observe(child));
    }
    this._positionChildren(this._childrenPos);
    this._sizeContainer(this._scrollSize);
    if (this._scrollErr) {
      this._correctScrollError(this._scrollErr);
      this._scrollErr = null;
    }
    if (this._benchmarkStart && "mark" in window.performance) {
      window.performance.mark("uv-end");
    }
  }
  _updateLayout() {
    this._layout.totalItems = this._totalItems;
    if (this._scrollToIndex !== null) {
      this._layout.scrollToIndex(
        this._scrollToIndex.index,
        this._scrollToIndex.position
      );
      this._scrollToIndex = null;
    }
    this._updateView();
    if (this._childMeasurements !== null) {
      // If the layout has been changed, we may have measurements but no callback
      if (this._measureCallback) {
        this._measureCallback(this._childMeasurements);
      }
      this._childMeasurements = null;
    }
    this._layout.reflowIfNeeded(this._itemsChanged);
    if (this._benchmarkStart && "mark" in window.performance) {
      window.performance.mark("uv-end");
    }
  }
  _handleScrollEvent() {
    if (this._benchmarkStart && "mark" in window.performance) {
      try {
        window.performance.measure("uv-virtualizing", "uv-start", "uv-end");
      } catch (e) {
        console.warn("Error measuring performance data: ", e);
      }
      window.performance.mark("uv-start");
    }
    this._schedule(this._updateLayout);
  }
  handleEvent(event) {
    switch (event.type) {
      case "scroll":
        if (!this._scrollTarget || event.target === this._scrollTarget) {
          this._handleScrollEvent();
        }
        break;
      case "scrollsizechange":
        this._scrollSize = event.detail;
        this._schedule(this._updateDOM);
        break;
      case "scrollerrorchange":
        this._scrollErr = event.detail;
        this._schedule(this._updateDOM);
        break;
      case "itempositionchange":
        this._childrenPos = event.detail;
        this._schedule(this._updateDOM);
        break;
      case "rangechange":
        this._adjustRange(event.detail);
        this._schedule(this._updateDOM);
        break;
      default:
        console.warn("event not handled", event);
    }
  }
  async _initResizeObservers() {
    if (this._containerRO === null) {
      const ResizeObserver = await getResizeObserver();
      this._containerRO = new ResizeObserver((entries) =>
        this._containerSizeChanged(entries[0].contentRect)
      );
      this._childrenRO = new ResizeObserver(
        this._childrenSizeChanged.bind(this)
      );
      this._mutationObserver = new MutationObserver(
        this._observeMutations.bind(this)
      );
    }
  }
  _createContainerSizer() {
    const sizer = document.createElement("div");
    // When the scrollHeight is large, the height of this element might be
    // ignored. Setting content and font-size ensures the element has a size.
    Object.assign(sizer.style, {
      position: "absolute",
      margin: "-2px 0 0 0",
      padding: 0,
      visibility: "hidden",
      fontSize: "2px",
    });
    sizer.innerHTML = "&nbsp;";
    sizer.id = "uni-virtualizer-spacer";
    return sizer;
  }
  get _children() {
    const arr = [];
    let next = this.container.firstElementChild;
    while (next) {
      // Skip our spacer. TODO (graynorton): Feels a bit hacky. Anything better?
      if (next.id !== "uni-virtualizer-spacer") {
        arr.push(next);
      }
      next = next.nextElementSibling;
    }
    return arr;
  }
  _updateView() {
    if (!this.container || !this._containerElement || !this._layout) {
      return;
    }
    let width, height, top, left;
    if (
      this._scrollTarget === this._containerElement &&
      this._containerSize !== null
    ) {
      width = this._containerSize.width;
      height = this._containerSize.height;
      left = this._containerElement.scrollLeft;
      top = this._containerElement.scrollTop;
    } else {
      const containerBounds = this._containerElement.getBoundingClientRect();
      const scrollBounds = this._scrollTarget
        ? this._scrollTarget.getBoundingClientRect()
        : {
            top: containerBounds.top + window.pageYOffset,
            left: containerBounds.left + window.pageXOffset,
            width: innerWidth,
            height: innerHeight,
          };
      const scrollerWidth = scrollBounds.width;
      const scrollerHeight = scrollBounds.height;
      const xMin = Math.max(
        0,
        Math.min(scrollerWidth, containerBounds.left - scrollBounds.left)
      );
      const yMin = Math.max(
        0,
        Math.min(scrollerHeight, containerBounds.top - scrollBounds.top)
      );
      // TODO (graynorton): Direction is intended to be a layout-level concept, not a scroller-level concept,
      // so this feels like a factoring problem
      const xMax =
        this._layout.direction === "vertical"
          ? Math.max(
              0,
              Math.min(scrollerWidth, containerBounds.right - scrollBounds.left)
            )
          : scrollerWidth;
      const yMax =
        this._layout.direction === "vertical"
          ? scrollerHeight
          : Math.max(
              0,
              Math.min(
                scrollerHeight,
                containerBounds.bottom - scrollBounds.top
              )
            );
      width = xMax - xMin;
      height = yMax - yMin;
      left = Math.max(0, -(containerBounds.left - scrollBounds.left));
      top = Math.max(0, -(containerBounds.top - scrollBounds.top));
    }
    this._layout.viewportSize = { width, height };
    this._layout.viewportScroll = { top, left };
  }
  /**
   * Styles the _sizer element or the container so that its size reflects the
   * total size of all items.
   */
  _sizeContainer(size) {
    if (this._scrollTarget === this._containerElement) {
      const left = size && size.width ? size.width - 1 : 0;
      const top = size && size.height ? size.height - 1 : 0;
      if (this._sizer) {
        this._sizer.style.transform = `translate(${left}px, ${top}px)`;
      }
    } else {
      if (this._containerElement) {
        const style = this._containerElement.style;
        style.minWidth = size && size.width ? size.width + "px" : null;
        style.minHeight = size && size.height ? size.height + "px" : null;
      }
    }
  }
  /**
   * Sets the top and left transform style of the children from the values in
   * pos.
   */
  _positionChildren(pos) {
    if (pos) {
      const children = this._children;
      Object.keys(pos).forEach((key) => {
        const idx = key - this._first;
        const child = children[idx];
        if (child) {
          const { top, left, width, height } = pos[key];
          child.style.position = "absolute";
          child.style.boxSizing = "border-box";
          child.style.transform = `translate(${left}px, ${top}px)`;
          if (width !== undefined) {
            child.style.width = width + "px";
          }
          if (height !== undefined) {
            child.style.height = height + "px";
          }
        }
      });
    }
  }
  async _adjustRange(range) {
    const { _first, _last, _firstVisible, _lastVisible } = this;
    this._first = range.first;
    this._last = range.last;
    this._firstVisible = range.firstVisible;
    this._lastVisible = range.lastVisible;
    this._rangeChanged =
      this._rangeChanged || this._first !== _first || this._last !== _last;
    this._visibilityChanged =
      this._visibilityChanged ||
      this._firstVisible !== _firstVisible ||
      this._lastVisible !== _lastVisible;
  }
  _correctScrollError(err) {
    if (this._scrollTarget) {
      this._scrollTarget.scrollTop -= err.top;
      this._scrollTarget.scrollLeft -= err.left;
    } else {
      window.scroll(
        window.pageXOffset - err.left,
        window.pageYOffset - err.top
      );
    }
  }
  /**
   * Emits a rangechange event with the current first, last, firstVisible, and
   * lastVisible.
   */
  _notifyRange() {
    // TODO (graynorton): Including visibility here for backward compat, but
    // may decide to remove at some point. The rationale for separating is that
    // range change events are mainly intended for "internal" consumption by the
    // renderer, whereas visibility change events are mainly intended for "external"
    // consumption by application code.
    this._container.dispatchEvent(
      new CustomEvent("rangeChanged", {
        detail: {
          first: this._first,
          last: this._last,
          firstVisible: this._firstVisible,
          lastVisible: this._lastVisible,
        },
      })
    );
  }
  _notifyVisibility() {
    this._container.dispatchEvent(
      new CustomEvent("visibilityChanged", {
        detail: {
          first: this._first,
          last: this._last,
          firstVisible: this._firstVisible,
          lastVisible: this._lastVisible,
        },
      })
    );
  }
  /**
   * Render and update the view at the next opportunity with the given
   * container size.
   */
  _containerSizeChanged(size) {
    const { width, height } = size;
    this._containerSize = { width, height };
    this._schedule(this._updateLayout);
  }
  async _observeMutations() {
    if (!this._mutationsObserved) {
      this._mutationsObserved = true;
      this._mutationPromiseResolver();
      this._mutationPromise = new Promise(
        (resolve) => (this._mutationPromiseResolver = resolve)
      );
      this._mutationsObserved = false;
    }
  }
  // TODO (graynorton): Rethink how this works. Probably child loading is too specific
  // to have dedicated support for; might want some more generic lifecycle hooks for
  // layouts to use. Possibly handle measurement this way, too, or maybe that remains
  // a first-class feature?
  _childLoaded() {
    // this.requestRemeasure();
  }
  _childrenSizeChanged(changes) {
    for (const change of changes) {
      this._toBeMeasured.set(change.target, change.contentRect);
    }
    this._measureChildren();
    this._schedule(this._updateLayout);
  }
}
function getMargins(el) {
  const style = window.getComputedStyle(el);
  return {
    marginTop: getMarginValue(style.marginTop),
    marginRight: getMarginValue(style.marginRight),
    marginBottom: getMarginValue(style.marginBottom),
    marginLeft: getMarginValue(style.marginLeft),
  };
}
function getMarginValue(value) {
  const float = value ? parseFloat(value) : NaN;
  return Number.isNaN(float) ? 0 : float;
}
//# sourceMappingURL=VirtualScroller.js.map
