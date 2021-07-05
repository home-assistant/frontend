export declare type dimension = "height" | "width";
export declare type Size = {
  [key in dimension]: number;
};
export declare type Margins = {
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
};
export declare type ItemBox = Size | (Size & Margins);
export declare type position = "left" | "top";
export declare type Positions = {
  left: number;
  top: number;
  width?: number;
  height?: number;
};
export declare type LayoutConstructor = new (config?: object) => Layout;
export interface LayoutSpecifier {
  type: LayoutConstructor;
}
export declare type LayoutSpecifierFactory = (
  config?: object
) => LayoutSpecifier;
export declare type ScrollDirection = "vertical" | "horizontal";
/**
 * Interface for layouts consumed by VirtualScroller or VirtualRepeater.
 */
export interface Layout {
  config?: object;
  totalItems: number;
  direction: ScrollDirection;
  viewportSize: Size;
  viewportScroll: Positions;
  readonly measureChildren?: boolean | ((e: Element, i: unknown) => ItemBox);
  readonly listenForChildLoadEvents?: boolean;
  updateItemSizes?: (sizes: { [key: number]: ItemBox }) => void;
  addEventListener: Function;
  removeEventListener: Function;
  scrollToIndex: (index: number, position: string) => void;
  /**
   * Called by a VirtualRepeater or VirtualScroller when an update that
   * potentially affects layout has occurred. For example, a viewport size
   * change.
   *
   * The layout is in turn responsible for dispatching events, as necessary,
   * to the VirtualRepeater or VirtualScroller. Each of the following events
   * represents an update that should be determined during a reflow. Dispatch
   * each event at maximum once during a single reflow.
   *
   * Events that should be dispatched:
   * - scrollsizechange
   *     Dispatch when the total length of all items in the scrolling direction,
   *     including spacing, changes.
   *     detail: {
   *       'height' | 'width': number
   *     }
   * - rangechange
   *     Dispatch when the range of children that should be displayed changes
   *     (based on layout calculations and the size of the container) or when
   *     the first or last item to intersect the container changes.
   *     detail: {
   *       first: number,
   *       last: number,
   *       num: number,
   *       stable: boolean,
   *       remeasure: boolean,
   *       firstVisible: number,
   *       lastVisible: number,
   *     }
   * - itempositionchange
   *     Dispatch when the child positions change, for example due to a range
   *     change.
   *     detail {
   *       [number]: {
   *         left: number,
   *         top: number
   *       }
   *     }
   * - scrollerrorchange
   *     Dispatch when the set viewportScroll offset is not what it should be.
   *     detail {
   *       height: number,
   *       width: number,
   *     }
   */
  reflowIfNeeded: (force: boolean) => void;
}
//# sourceMappingURL=Layout.d.ts.map
