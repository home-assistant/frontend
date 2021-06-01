import { LitElement, TemplateResult } from "lit";
import {
  LayoutSpecifier,
  Layout,
  LayoutConstructor,
} from "./uni-virtualizer/lib/layouts/Layout.js";
/**
 * A LitElement wrapper of the scroll directive.
 *
 * Import this module to declare the lit-virtualizer custom element.
 * Pass an items array, renderItem method, and scroll target as properties
 * to the <lit-virtualizer> element.
 */
export declare class LitVirtualizer extends LitElement {
  renderItem?: (item: any, index?: number) => TemplateResult;
  items: Array<unknown>;
  scrollTarget: Element | Window;
  keyFunction: ((item: unknown) => unknown) | undefined;
  private _layout;
  private _scrollToIndex;
  createRenderRoot(): this;
  /**
   * The method used for rendering each item.
   */
  set layout(layout: Layout | LayoutConstructor | LayoutSpecifier | null);
  get layout(): Layout | LayoutConstructor | LayoutSpecifier | null;
  /**
   * Scroll to the specified index, placing that item at the given position
   * in the scroll view.
   */
  scrollToIndex(index: number, position?: string): Promise<void>;
  render(): TemplateResult;
}
declare global {
  interface HTMLElementTagNameMap {
    "lit-virtualizer": LitVirtualizer;
  }
}
//# sourceMappingURL=lit-virtualizer.d.ts.map
