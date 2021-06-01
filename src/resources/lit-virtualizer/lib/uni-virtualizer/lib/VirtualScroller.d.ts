import {
  ItemBox,
  Layout,
  LayoutConstructor,
  LayoutSpecifier,
} from "./layouts/Layout.js";
export declare const scrollerRef: unique symbol;
export declare type RangeChangeEvent = {
  first: number;
  last: number;
  firstVisible: number;
  lastVisible: number;
};
interface ElementWithOptionalScrollerRef extends Element {
  [scrollerRef]?: VirtualScroller;
}
interface ShadowRootWithOptionalScrollerRef extends ShadowRoot {
  [scrollerRef]?: VirtualScroller;
}
declare type Container =
  | ElementWithOptionalScrollerRef
  | ShadowRootWithOptionalScrollerRef;
export declare type ContainerElement = ElementWithOptionalScrollerRef;
declare type ChildMeasurements = {
  [key: number]: ItemBox;
};
export declare type ScrollToIndexValue = {
  index: number;
  position?: string;
} | null;
export interface VirtualScrollerConfig {
  layout?: Layout | LayoutConstructor | LayoutSpecifier;
  /**
   * An element that receives scroll events for the virtual scroller.
   */
  scrollTarget?: Element | Window;
  /**
   * The parent of all child nodes to be rendered.
   */
  container: Element | ShadowRoot;
}
/**
 * Provides virtual scrolling boilerplate.
 *
 * Extensions of this class must set container, layout, and scrollTarget.
 *
 * Extensions of this class must also override VirtualRepeater's DOM
 * manipulation methods.
 */
export declare class VirtualScroller {
  private _benchmarkStart;
  /**
   * Whether the layout should receive an updated viewport size on the next
   * render.
   */
  private _layout;
  /**
   * The element that generates scroll events and defines the container
   * viewport. Set by scrollTarget.
   */
  private _scrollTarget;
  /**
   * A sentinel element that sizes the container when it is a scrolling
   * element. This ensures the scroll bar accurately reflects the total
   * size of the list.
   */
  private _sizer;
  /**
   * Layout provides these values, we set them on _render().
   * TODO @straversi: Can we find an XOR type, usable for the key here?
   */
  private _scrollSize;
  /**
   * Difference between scroll target's current and required scroll offsets.
   * Provided by layout.
   */
  private _scrollErr;
  /**
   * A list of the positions (top, left) of the children in the current range.
   */
  private _childrenPos;
  private _childMeasurements;
  private _toBeMeasured;
  private _rangeChanged;
  private _itemsChanged;
  private _visibilityChanged;
  /**
   * Containing element. Set by container.
   */
  protected _container: Container | null;
  /**
   * The parent of all child nodes to be rendered. Set by container.
   */
  private _containerElement;
  /**
   * Keep track of original inline style of the container, so it can be
   * restored when container is changed.
   */
  private _containerInlineStyle;
  /**
   * Size of the container.
   */
  private _containerSize;
  /**
   * Resize observer attached to container.
   */
  private _containerRO;
  /**
   * Resize observer attached to children.
   */
  private _childrenRO;
  private _mutationObserver;
  private _mutationPromise;
  private _mutationPromiseResolver;
  private _mutationsObserved;
  private _loadListener;
  /**
   * Index and position of item to scroll to.
   */
  private _scrollToIndex;
  /**
   * Items to render. Set by items.
   */
  private _items;
  /**
   * Total number of items to render. Set by totalItems.
   */
  private _totalItems;
  /**
   * Index of the first child in the range, not necessarily the first visible child.
   * TODO @straversi: Consider renaming these.
   */
  protected _first: number;
  /**
   * Index of the last child in the range.
   */
  protected _last: number;
  /**
   * Index of the first item intersecting the container element.
   */
  private _firstVisible;
  /**
   * Index of the last item intersecting the container element.
   */
  private _lastVisible;
  protected _scheduled: WeakSet<object>;
  /**
   * Invoked at the end of each render cycle: children in the range are
   * measured, and their dimensions passed to this callback. Use it to layout
   * children as needed.
   */
  protected _measureCallback: ((sizes: ChildMeasurements) => void) | null;
  protected _measureChildOverride:
    | ((element: Element, item: unknown) => ItemBox)
    | null;
  constructor(config?: VirtualScrollerConfig);
  set items(items: Array<unknown> | undefined);
  /**
   * The total number of items, regardless of the range, that can be rendered
   * as child nodes.
   */
  get totalItems(): number;
  set totalItems(num: number);
  /**
   * The parent of all child nodes to be rendered.
   */
  get container(): Container | null;
  set container(container: Container | null);
  get layout(): Layout | LayoutConstructor | LayoutSpecifier | null;
  set layout(layout: Layout | LayoutConstructor | LayoutSpecifier | null);
  startBenchmarking(): void;
  stopBenchmarking(): {
    timeElapsed: number;
    virtualizationTime: number;
  } | null;
  private _measureChildren;
  /**
   * Returns the width, height, and margins of the given child.
   */
  _measureChild(element: Element): ItemBox;
  /**
   * The element that generates scroll events and defines the container
   * viewport. The value `null` (default) corresponds to `window` as scroll
   * target.
   */
  get scrollTarget(): Element | Window | null;
  set scrollTarget(target: Element | Window | null);
  /**
   * Index and position of item to scroll to. The scroller will fix to that point
   * until the user scrolls.
   */
  set scrollToIndex(newValue: ScrollToIndexValue);
  protected _schedule(method: Function): Promise<void>;
  _updateDOM(): Promise<void>;
  _updateLayout(): void;
  private _handleScrollEvent;
  handleEvent(event: CustomEvent): void;
  private _initResizeObservers;
  private _createContainerSizer;
  get _children(): Array<HTMLElement>;
  private _updateView;
  /**
   * Styles the _sizer element or the container so that its size reflects the
   * total size of all items.
   */
  private _sizeContainer;
  /**
   * Sets the top and left transform style of the children from the values in
   * pos.
   */
  private _positionChildren;
  private _adjustRange;
  private _correctScrollError;
  /**
   * Emits a rangechange event with the current first, last, firstVisible, and
   * lastVisible.
   */
  private _notifyRange;
  private _notifyVisibility;
  /**
   * Render and update the view at the next opportunity with the given
   * container size.
   */
  private _containerSizeChanged;
  private _observeMutations;
  private _childLoaded;
  private _childrenSizeChanged;
}
export {};
//# sourceMappingURL=VirtualScroller.d.ts.map
