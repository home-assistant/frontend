import {
  Layout,
  Positions,
  ScrollDirection,
  Size,
  dimension,
  position,
} from "./Layout.js";
declare type UpdateVisibleIndicesOptions = {
  emit?: boolean;
};
export interface Layout1dBaseConfig {
  direction?: ScrollDirection;
  totalItems?: number;
}
export declare abstract class Layout1dBase<C extends Layout1dBaseConfig>
  implements Layout
{
  /**
   * The last set viewport scroll position.
   */
  private _latestCoords;
  /**
   * Scrolling direction.
   */
  private _direction;
  /**
   * Dimensions of the viewport.
   */
  private _viewportSize;
  /**
   * Flag for debouncing asynchnronous reflow requests.
   */
  private _pendingReflow;
  private _pendingLayoutUpdate;
  /**
   * Index of the item that has been scrolled to via the public API. When the
   * container is otherwise scrolled, this value is set back to -1.
   */
  protected _scrollToIndex: number;
  /**
   * When a child is scrolled to, the offset from the top of the child and the
   * top of the viewport. Value is a proportion of the item size.
   */
  private _scrollToAnchor;
  /**
   * The index of the first item intersecting the viewport.
   */
  private _firstVisible;
  /**
   * The index of the last item intersecting the viewport.
   */
  private _lastVisible;
  private _eventTargetPromise;
  /**
   * Pixel offset in the scroll direction of the first child.
   */
  protected _physicalMin: number;
  /**
   * Pixel offset in the scroll direction of the last child.
   */
  protected _physicalMax: number;
  /**
   * Index of the first child.
   */
  protected _first: number;
  /**
   * Index of the last child.
   */
  protected _last: number;
  /**
   * The _estimated_ size of a child.
   */
  protected _itemSize: Size;
  /**
   * Space in pixels between children.
   */
  protected _spacing: number;
  /**
   * Length in the scrolling direction.
   */
  protected _sizeDim: dimension;
  /**
   * Length in the non-scrolling direction.
   */
  protected _secondarySizeDim: dimension;
  /**
   * Position in the scrolling direction.
   */
  protected _positionDim: position;
  /**
   * Position in the non-scrolling direction.
   */
  protected _secondaryPositionDim: position;
  /**
   * Current scroll offset in pixels.
   */
  protected _scrollPosition: number;
  /**
   * Difference between current scroll offset and scroll offset calculated due
   * to a reflow.
   */
  protected _scrollError: number;
  /**
   * Total number of items that could possibly be displayed. Used to help
   * calculate the scroll size.
   */
  protected _totalItems: number;
  /**
   * The total (estimated) length of all items in the scrolling direction.
   */
  protected _scrollSize: number;
  /**
   * Number of pixels beyond the visible size of the container to still include
   * in the active range of items.
   */
  protected _overhang: number;
  private _eventTarget;
  protected _spacingChanged: boolean;
  protected _defaultConfig: C;
  constructor(config?: C);
  set config(config: C);
  get config(): C;
  /**
   * Maximum index of children + 1, to help estimate total height of the scroll
   * space.
   */
  get totalItems(): number;
  set totalItems(num: number);
  /**
   * Primary scrolling direction.
   */
  get direction(): ScrollDirection;
  set direction(dir: ScrollDirection);
  /**
   * Estimate of the dimensions of a single child.
   */
  get itemSize(): Size;
  set itemSize(dims: Size);
  /**
   * Amount of space in between items.
   */
  get spacing(): number;
  set spacing(px: number);
  /**
   * Height and width of the viewport.
   */
  get viewportSize(): Size;
  set viewportSize(dims: Size);
  /**
   * Scroll offset of the viewport.
   */
  get viewportScroll(): Positions;
  set viewportScroll(coords: Positions);
  /**
   * Perform a reflow if one has been scheduled.
   */
  reflowIfNeeded(force: boolean): void;
  /**
   * Scroll to the child at the given index, and the given position within that
   * child.
   */
  scrollToIndex(index: number, position?: string): void;
  dispatchEvent(evt: Event): Promise<void>;
  addEventListener(
    type: string,
    listener: EventListener | EventListenerObject | null,
    options?: boolean | AddEventListenerOptions | undefined
  ): Promise<void>;
  removeEventListener(
    type: string,
    callback: EventListener | EventListenerObject | null,
    options?: boolean | EventListenerOptions | undefined
  ): Promise<void>;
  /**
   * Get the top and left positioning of the item at idx.
   */
  abstract _getItemPosition(idx: number): Positions;
  /**
   * Update _first and _last based on items that should be in the current
   * range.
   */
  abstract _getActiveItems(): void;
  protected _itemDim2Changed(): void;
  protected _viewDim2Changed(): void;
  protected _updateLayout(): void;
  protected _getItemSize(_idx: number): Size;
  /**
   * The size of an item in the scrolling direction + space between items.
   */
  protected get _delta(): number;
  /**
   * The height or width of an item, whichever corresponds to the scrolling direction.
   */
  protected get _itemDim1(): number;
  /**
   * The height or width of an item, whichever does NOT correspond to the scrolling direction.
   */
  protected get _itemDim2(): number;
  /**
   * The height or width of the viewport, whichever corresponds to the scrolling direction.
   */
  protected get _viewDim1(): number;
  /**
   * The height or width of the viewport, whichever does NOT correspond to the scrolling direction.
   */
  protected get _viewDim2(): number;
  protected _scheduleReflow(): void;
  protected _scheduleLayoutUpdate(): void;
  protected _reflow(): void;
  /**
   * Estimates the total length of all items in the scrolling direction, including spacing.
   */
  protected _updateScrollSize(): void;
  protected _scrollIfNeeded(): void;
  protected _emitRange(inProps?: unknown): void;
  protected _emitScrollSize(): void;
  protected _emitScrollError(): void;
  /**
   * Get or estimate the top and left positions of items in the current range.
   * Emit an itempositionchange event with these positions.
   */
  protected _emitChildPositions(): void;
  /**
   * Number of items to display.
   */
  private get _num();
  private _checkThresholds;
  /**
   * Find the indices of the first and last items to intersect the viewport.
   * Emit a visibleindiceschange event when either index changes.
   */
  protected _updateVisibleIndices(options?: UpdateVisibleIndicesOptions): void;
  private _scrollPositionChanged;
}
export {};
//# sourceMappingURL=Layout1dBase.d.ts.map
