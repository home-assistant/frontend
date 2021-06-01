import { TemplateResult, ChildPart } from "lit";
import { PartInfo } from "lit/directive.js";
import { AsyncDirective } from "lit/async-directive.js";
import {
  Layout,
  LayoutConstructor,
  LayoutSpecifier,
} from "./uni-virtualizer/lib/layouts/Layout.js";
import {
  VirtualScroller,
  ScrollToIndexValue,
} from "./uni-virtualizer/lib/VirtualScroller.js";
/**
 * Configuration options for the scroll directive.
 */
interface ScrollConfig {
  /**
   * A function that returns a lit-html TemplateResult. It will be used
   * to generate the DOM for each item in the virtual list.
   */
  renderItem?: (item: any, index?: number) => TemplateResult;
  keyFunction?: (item: any) => unknown;
  layout?: Layout | LayoutConstructor | LayoutSpecifier | null;
  /**
   * An element that receives scroll events for the virtual scroller.
   */
  scrollTarget?: Element | Window;
  /**
   * The list of items to display via the renderItem function.
   */
  items?: Array<any>;
  /**
   * Limit for the number of items to display. Defaults to the length of the
   * items array.
   */
  totalItems?: number;
  /**
   * Index and position of the item to scroll to.
   */
  scrollToIndex?: ScrollToIndexValue;
}
export declare const defaultKeyFunction: (item: any) => any;
export declare const defaultRenderItem: (item: any) => TemplateResult<1>;
declare class ScrollDirective extends AsyncDirective {
  container: HTMLElement | null;
  scroller: VirtualScroller | null;
  first: number;
  last: number;
  renderItem: (item: any, index?: number) => TemplateResult;
  keyFunction: (item: any) => unknown;
  items: Array<unknown>;
  constructor(part: PartInfo);
  render(config?: ScrollConfig): unknown;
  update(part: ChildPart, [config]: [ScrollConfig]): unknown;
  private _initialize;
}
export declare const scroll: (
  config?: ScrollConfig | undefined
) => import("lit-html/directive").DirectiveResult<typeof ScrollDirective>;
export {};
//# sourceMappingURL=scroll.d.ts.map
