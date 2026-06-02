import { nothing, render } from "lit";
import type { LitTooltipFormatter } from "../../resources/echarts/echarts";

type WrappedTooltipFormatter = (
  params: unknown,
  ticket?: string
) => HTMLElement | null;

export type { WrappedTooltipFormatter };

const litTooltipFormatterCache = new WeakMap<
  LitTooltipFormatter | WrappedTooltipFormatter,
  WrappedTooltipFormatter
>();

export const wrapLitTooltipFormatter = (
  fn: LitTooltipFormatter | WrappedTooltipFormatter
): WrappedTooltipFormatter => {
  const cached = litTooltipFormatterCache.get(fn);
  if (cached) return cached;
  const container = document.createElement("div");
  // display:contents keeps the wrapper layout-invisible so its children act as
  // direct children of echarts' tooltip box, matching the prior innerHTML behavior.
  container.style.display = "contents";
  const wrapped: WrappedTooltipFormatter = (params, ticket) => {
    const result = (fn as LitTooltipFormatter)(params, ticket);
    // `nothing` and null/undefined must all suppress the tooltip. Returning
    // `nothing` to echarts via `render(nothing, container)` leaves a Lit
    // comment marker behind so echarts would show an empty box; convert it to
    // null instead so `setContent(null)` clears innerHTML and `show()` hides.
    if (result === null || result === undefined || result === nothing) {
      return null;
    }
    render(result, container);
    return container;
  };
  litTooltipFormatterCache.set(fn, wrapped);
  // Idempotent re-wrap: looking up the wrapped fn returns itself.
  litTooltipFormatterCache.set(wrapped, wrapped);
  return wrapped;
};
