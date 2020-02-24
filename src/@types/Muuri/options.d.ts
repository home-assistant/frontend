import Grid from "muuri";
import { Item } from "./item";
import { DraggerEvent } from "./events";

export interface Options {
  items?: Element[] | NodeList | string;
  showDuration?: number;
  showEasing?: string;
  hideDuration?: number;
  hideEasing?: string;
  visibleStyles?: ElementCSSInlineStyle["style"];
  hiddenStyles?: ElementCSSInlineStyle["style"];
  layout?: LayoutOpts | LayoutFunction;
  layoutOnResize?: boolean | number;
  layoutOnInit?: boolean;
  layoutDuration?: number;
  layoutEasing?: string;
  sortData?: Record<string, SortFunction>;
  dragEnabled?: boolean;
  dragContainer?: Element;
  dragStartPredicate?: DragStartPredicateOpts | DragStartPredicateFunction;
  dragAxis?: "x" | "y";
  dragSort?: DragSort;
  dragSortHeuristics?: DragSortHeuristics;
  dragSortPredicate?: DragSortPredicateOpts | DragSortPredicateFunction;
  dragReleaseDuration?: number;
  dragReleaseEasing?: string;
  dragCssProps?: DragCssProps;
  dragPlaceholder?: DragPlaceholder;
  containerClass?: string;
  itemClass?: string;
  itemVisibleClass?: string;
  itemHiddenClass?: string;
  itemPositioningClass?: string;
  itemDraggingClass?: string;
  itemReleasingClass?: string;
  itemPlaceholderClass?: string;
}

export type LayoutOpts = {
  fillGaps?: boolean;
  horizontal?: boolean;
  alignRight?: boolean;
  alignBottom?: boolean;
  rounding?: boolean;
};
export type LayoutFunction = (
  items: Item[],
  gridWidth: number,
  gridHeight: number
) => {
  slots: number[];
  width: number;
  height: number;
  setWidth: boolean;
  setHeight: boolean;
};

export type SortFunction = (item: Item, element: Element) => string | number;

export type DragStartPredicateOpts = {
  distance?: number;
  delay?: number;
  handle?: string | boolean;
};
export type DragStartPredicateFunction = (
  item: Item,
  event: DraggerEvent
) => boolean | void;

export type DragSort = boolean | ((item: Item) => Grid[]);

export type DragSortHeuristics = {
  sortInterval?: number;
  minDragDistance?: number;
  minBounceBackAngle?: number;
};

export type DragSortPredicateOpts = {
  action?: "move" | "swap";
  threshold?: number;
};
export type DragSortPredicateFunction = (
  item: Item,
  event: DraggerEvent
) =>
  | false
  | {
      index: number;
      grid: Grid;
      action: string;
    };

export type DragCssProps = {
  touchAction?: string;
  userSelect?: string;
  userDrag?: string;
  tapHighlightColor?: string;
  touchCallout?: string;
  contentZooming?: string;
};

export type DragPlaceholder = {
  enabled: boolean;
  duration: number;
  easing: string;
  createElement: (item: Item) => Element;
  onCreate: (item: Item, element: Element) => any;
  onRemove: (item: Item, element: Element) => any;
};
