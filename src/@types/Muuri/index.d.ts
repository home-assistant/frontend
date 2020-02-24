declare module "muuri" {
  type MaybePlural<T> = T[] | T;
  type Item = import("./item").Item;
  type Options = import("./options").Options;
  type LayoutFunction = import("./options").LayoutFunction;
  type EventListeners = import("./events").EventListeners;
  type ItemSelector = Element | Item | number;

  /**
   * Creates a new Grid instance.
   *
   * @class
   * @param {(HTMLElement|String)} element
   * @param {Object} [options]
   * @param {?(HTMLElement[]|NodeList|String)} [options.items]
   * @param {Number} [options.showDuration=300]
   * @param {String} [options.showEasing="ease"]
   * @param {Object} [options.visibleStyles]
   * @param {Number} [options.hideDuration=300]
   * @param {String} [options.hideEasing="ease"]
   * @param {Object} [options.hiddenStyles]
   * @param {(Function|Object)} [options.layout]
   * @param {Boolean} [options.layout.fillGaps=false]
   * @param {Boolean} [options.layout.horizontal=false]
   * @param {Boolean} [options.layout.alignRight=false]
   * @param {Boolean} [options.layout.alignBottom=false]
   * @param {Boolean} [options.layout.rounding=true]
   * @param {(Boolean|Number)} [options.layoutOnResize=100]
   * @param {Boolean} [options.layoutOnInit=true]
   * @param {Number} [options.layoutDuration=300]
   * @param {String} [options.layoutEasing="ease"]
   * @param {?Object} [options.sortData=null]
   * @param {Boolean} [options.dragEnabled=false]
   * @param {?HtmlElement} [options.dragContainer=null]
   * @param {?Function} [options.dragStartPredicate]
   * @param {Number} [options.dragStartPredicate.distance=0]
   * @param {Number} [options.dragStartPredicate.delay=0]
   * @param {(Boolean|String)} [options.dragStartPredicate.handle=false]
   * @param {?String} [options.dragAxis]
   * @param {(Boolean|Function)} [options.dragSort=true]
   * @param {Object} [options.dragSortHeuristics]
   * @param {Number} [options.dragSortHeuristics.sortInterval=100]
   * @param {Number} [options.dragSortHeuristics.minDragDistance=10]
   * @param {Number} [options.dragSortHeuristics.minBounceBackAngle=1]
   * @param {(Function|Object)} [options.dragSortPredicate]
   * @param {Number} [options.dragSortPredicate.threshold=50]
   * @param {String} [options.dragSortPredicate.action="move"]
   * @param {Number} [options.dragReleaseDuration=300]
   * @param {String} [options.dragReleaseEasing="ease"]
   * @param {Object} [options.dragCssProps]
   * @param {Object} [options.dragPlaceholder]
   * @param {Boolean} [options.dragPlaceholder.enabled=false]
   * @param {Number} [options.dragPlaceholder.duration=300]
   * @param {String} [options.dragPlaceholder.easing="ease"]
   * @param {?Function} [options.dragPlaceholder.createElement=null]
   * @param {?Function} [options.dragPlaceholder.onCreate=null]
   * @param {?Function} [options.dragPlaceholder.onRemove=null]
   * @param {String} [options.containerClass="muuri"]
   * @param {String} [options.itemClass="muuri-item"]
   * @param {String} [options.itemVisibleClass="muuri-item-visible"]
   * @param {String} [options.itemHiddenClass="muuri-item-hidden"]
   * @param {String} [options.itemPositioningClass="muuri-item-positioning"]
   * @param {String} [options.itemDraggingClass="muuri-item-dragging"]
   * @param {String} [options.itemReleasingClass="muuri-item-releasing"]
   * @param {String} [options.itemPlaceholderClass="muuri-item-placeholder"]
   */
  export default class Muuri {
    constructor(element: string | Element, options?: Options);

    /**
     * Get the container element.
     *
     * @public
     * @memberof Grid.prototype
     * @returns {HTMLElement}
     */
    public getElement(): Element;

    /**
     * Get all items. Optionally you can provide specific targets (elements and
     * indices). Note that the returned array is not the same object used by the
     * instance so modifying it will not affect instance's items. All items that
     * are not found are omitted from the returned array.
     *
     * @public
     * @memberof Grid.prototype
     * @param {GridMultiItemQuery} [targets]
     * @returns {Item[]}
     */
    public getItems(targets?: string[]): Item[];

    /**
     * Update the cached dimensions of the instance's items.
     *
     * @public
     * @memberof Grid.prototype
     * @param {GridMultiItemQuery} [items]
     * @returns {Grid}
     */
    public refreshItems(items?: MaybePlural<ItemSelector>): void;

    /**
     * Update the sort data of the instance's items.
     *
     * @public
     * @memberof Grid.prototype
     * @param {GridMultiItemQuery} [items]
     * @returns {Grid}
     */
    public refreshSortData(items?: MaybePlural<ItemSelector>): void;

    /**
     * Synchronize the item elements to match the order of the items in the DOM.
     * This comes handy if you need to keep the DOM structure matched with the
     * order of the items. Note that if an item's element is not currently a child
     * of the container element (if it is dragged for example) it is ignored and
     * left untouched.
     *
     * @public
     * @memberof Grid.prototype
     * @returns {Grid}
     */
    public synchronize(): void;

    /**
     * Calculate and apply item positions.
     *
     * @public
     * @memberof Grid.prototype
     * @param {Boolean} [instant=false]
     * @param {LayoutCallback} [onFinish]
     * @returns {Grid}
     */
    public layout(callback: (items: Item[]) => any): void;
    public layout(instant?: boolean, callback?: (items: Item[]) => any): void;

    /**
     * Add new items by providing the elements you wish to add to the instance and
     * optionally provide the index where you want the items to be inserted into.
     * All elements that are not already children of the container element will be
     * automatically appended to the container element. If an element has it's CSS
     * display property set to "none" it will be marked as inactive during the
     * initiation process. As long as the item is inactive it will not be part of
     * the layout, but it will retain it's index. You can activate items at any
     * point with grid.show() method. This method will automatically call
     * grid.layout() if one or more of the added elements are visible. If only
     * hidden items are added no layout will be called. All the new visible items
     * are positioned without animation during their first layout.
     *
     * @public
     * @memberof Grid.prototype
     * @param {(HTMLElement|HTMLElement[])} elements
     * @param {Object} [options]
     * @param {Number} [options.index=-1]
     * @param {Boolean} [options.isActive]
     * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
     * @returns {Item[]}
     */
    public add<T extends MaybePlural<Element>>(
      elements: T,
      options?: {
        index?: number;
        layout?: boolean | string | LayoutFunction;
      }
    ): T extends Element[] ? T : [T];

    /**
     * Remove items from the instance.
     *
     * @public
     * @memberof Grid.prototype
     * @param {GridMultiItemQuery} items
     * @param {Object} [options]
     * @param {Boolean} [options.removeElements=false]
     * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
     * @returns {Item[]}
     */
    public remove(
      items: MaybePlural<ItemSelector>,
      options?: {
        removeElements?: boolean;
        layout?: boolean | string | LayoutFunction;
      }
    ): Element[];

    /**
     * Show instance items.
     *
     * @public
     * @memberof Grid.prototype
     * @param {GridMultiItemQuery} items
     * @param {Object} [options]
     * @param {Boolean} [options.instant=false]
     * @param {ShowCallback} [options.onFinish]
     * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
     * @returns {Grid}
     */
    public show(
      items: MaybePlural<ItemSelector>,
      options?: {
        instant?: boolean;
        onFinish?: (items: Item[]) => any;
        layout?: boolean | string | LayoutFunction;
      }
    ): void;

    /**
     * Hide instance items.
     *
     * @public
     * @memberof Grid.prototype
     * @param {GridMultiItemQuery} items
     * @param {Object} [options]
     * @param {Boolean} [options.instant=false]
     * @param {HideCallback} [options.onFinish]
     * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
     * @returns {Grid}
     */
    public hide(
      items: MaybePlural<ItemSelector>,
      options?: {
        instant?: boolean;
        onFinish?: (items: Item[]) => any;
        layout?: boolean | string | LayoutFunction;
      }
    ): void;

    /**
     * Filter items. Expects at least one argument, a predicate, which should be
     * either a function or a string. The predicate callback is executed for every
     * item in the instance. If the return value of the predicate is truthy the
     * item in question will be shown and otherwise hidden. The predicate callback
     * receives the item instance as it's argument. If the predicate is a string
     * it is considered to be a selector and it is checked against every item
     * element in the instance with the native element.matches() method. All the
     * matching items will be shown and others hidden.
     *
     * @public
     * @memberof Grid.prototype
     * @param {(Function|String)} predicate
     * @param {Object} [options]
     * @param {Boolean} [options.instant=false]
     * @param {FilterCallback} [options.onFinish]
     * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
     * @returns {Grid}
     */
    public filter(
      predicate: string | ((item: Item) => boolean),
      options?: {
        instant?: boolean;
        onFinish?: () => any;
        layout?: boolean | string | LayoutFunction;
      }
    ): void;

    /**
     * Sort items. There are three ways to sort the items. The first is simply by
     * providing a function as the comparer which works identically to native
     * array sort. Alternatively you can sort by the sort data you have provided
     * in the instance's options. Just provide the sort data key(s) as a string
     * (separated by space) and the items will be sorted based on the provided
     * sort data keys. Lastly you have the opportunity to provide a presorted
     * array of items which will be used to sync the internal items array in the
     * same order.
     *
     * @public
     * @memberof Grid.prototype
     * @param {(Function|Item[]|String|String[])} comparer
     * @param {Object} [options]
     * @param {Boolean} [options.descending=false]
     * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
     * @returns {Grid}
     */
    public sort(
      comparer: string | string[] | ((a: Item, b: Item) => number),
      options?: {
        descending?: boolean;
        layout?: boolean | string | LayoutFunction;
      }
    ): void;

    /**
     * Move item to another index or in place of another item.
     *
     * @public
     * @memberof Grid.prototype
     * @param {GridSingleItemQuery} item
     * @param {GridSingleItemQuery} position
     * @param {Object} [options]
     * @param {String} [options.action="move"]
     *   - Accepts either "move" or "swap".
     *   - "move" moves the item in place of the other item.
     *   - "swap" swaps the position of the items.
     * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
     * @returns {Grid}
     */
    public move(
      item?: ItemSelector,
      position?: ItemSelector,
      options?: {
        action?: "move" | "swap";
        layout?: boolean | string | LayoutFunction;
      }
    ): void;

    /**
     * Send item to another Grid instance.
     *
     * @public
     * @memberof Grid.prototype
     * @param {GridSingleItemQuery} item
     * @param {Grid} grid
     * @param {GridSingleItemQuery} position
     * @param {Object} [options]
     * @param {HTMLElement} [options.appendTo=document.body]
     * @param {(Boolean|LayoutCallback|String)} [options.layoutSender=true]
     * @param {(Boolean|LayoutCallback|String)} [options.layoutReceiver=true]
     * @returns {Grid}
     */
    public send(
      item: ItemSelector,
      grid: Muuri,
      position: ItemSelector,
      options?: {
        appendTo?: Element;
        layoutSender?: boolean | string | LayoutFunction;
        layoutReceiver?: boolean | string | LayoutFunction;
      }
    ): void;

    /**
     * Destroy the instance.
     *
     * @public
     * @memberof Grid.prototype
     * @param {Boolean} [removeElements=false]
     * @returns {Grid}
     */
    public destroy(removeElements?: boolean): Muuri;

    // Events
    /**
     * Bind an event listener.
     *
     * @public
     * @memberof Grid.prototype
     * @param {String} event
     * @param {Function} listener
     * @returns {Grid}
     */
    public on<T extends keyof EventListeners>(
      event: T,
      listener: EventListeners[T]
    ): Muuri;
    /**
     * Unbind an event listener.
     *
     * @public
     * @memberof Grid.prototype
     * @param {String} event
     * @param {Function} listener
     * @returns {Grid}
     */
    public off<T extends keyof EventListeners>(
      event: T,
      listener: EventListeners[T]
    ): Muuri;
  }
}
