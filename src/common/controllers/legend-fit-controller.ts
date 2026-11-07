import type { ReactiveControllerHost } from "lit";
import { ref } from "lit/directives/ref";

const MAX_ROWS = 2;

// How many items fit in maxRows of a wrapping row, leaving room for the
// "more" item after them when not all of them fit.
export const fitInRows = (
  widths: number[],
  moreWidth: number,
  rowWidth: number,
  gap: number,
  maxRows: number
): number => {
  const fits = (end: number, width: number) =>
    end === 0 || end + gap + width <= rowWidth;
  let rows = 1;
  let end = 0;
  let fit = 0;
  for (const [index, width] of widths.entries()) {
    if (rows < maxRows || fits(end, moreWidth)) {
      fit = index;
    }
    if (fits(end, width)) {
      end += (end === 0 ? 0 : gap) + width;
    } else {
      rows++;
      end = width;
    }
    if (rows > maxRows) {
      return fit;
    }
  }
  return widths.length;
};

// Fits the items of a wrapping legend list into two rows. The list keeps its
// "more" item rendered with the legend-more class, and items past the fit
// stay rendered out of the flow, so both can always be measured.
export class LegendFitController {
  // Items to show while collapsed, undefined until the list is measured
  public fit?: number;

  private _host: ReactiveControllerHost;

  private _element?: Element;

  private _more?: Element;

  private _widths: number[] = [];

  private _rowWidth?: number;

  private _resizeObserver?: ResizeObserver;

  constructor(host: ReactiveControllerHost) {
    this._host = host;
  }

  public target() {
    return ref(this._setElement);
  }

  // Fits again from the current widths, for when the items change
  public refit() {
    this._widths = [];
    this._fit();
  }

  private _setElement = (element?: Element) => {
    if (element === this._element) {
      return;
    }
    this._resizeObserver?.disconnect();
    this._element = element;
    this._more = undefined;
    if (element) {
      this._resizeObserver ??= new ResizeObserver(() => this._fit());
      this._resizeObserver.observe(element);
    }
  };

  private _fit() {
    const list = this._element;
    const rowWidth = list?.getBoundingClientRect().width;
    if (!list || !rowWidth) {
      return;
    }
    const children = Array.from(list.children);
    const more = children.find((child) =>
      child.classList.contains("legend-more")
    );
    // Switching between More and Less resizes it, not always the list
    if (more !== this._more) {
      if (this._more) {
        this._resizeObserver?.unobserve(this._more);
      }
      if (more) {
        this._resizeObserver?.observe(more);
      }
      this._more = more;
    }
    const widths = children
      .filter((child) => child !== more)
      .map((child) => child.getBoundingClientRect().width);
    // Values resize the items on every state update. Fitting each item at its
    // widest since the last resize keeps the more button from flickering.
    if (rowWidth !== this._rowWidth || widths.length !== this._widths.length) {
      this._rowWidth = rowWidth;
      this._widths = widths;
    } else {
      this._widths = widths.map((width, index) =>
        Math.max(width, this._widths[index])
      );
    }
    const fit = fitInRows(
      this._widths,
      more?.getBoundingClientRect().width ?? 0,
      rowWidth,
      parseFloat(getComputedStyle(list).columnGap) || 0,
      MAX_ROWS
    );
    if (fit !== this.fit) {
      this.fit = fit;
      this._host.requestUpdate();
    }
  }
}
