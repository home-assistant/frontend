import { ResizeController } from "@lit-labs/observers/resize-controller";
import type { ReactiveControllerHost } from "lit";
import { clamp } from "../number/clamp";

// Count columns from the container's real width (not the viewport) so a
// docked sidebar is accounted for, like the dashboard sections view.
const MIN_COLUMN_WIDTH = 320;
const DEFAULT_COLUMN_GAP = 16;

const parsePx = (value: string) => parseInt(value, 10) || 0;

export const createColumnsController = (
  host: ReactiveControllerHost & Element,
  maxColumns: number
) =>
  new ResizeController<number>(host, {
    target: null,
    skipInitial: true,
    callback: (entries) => {
      const entry = entries[0];
      if (!entry) {
        return maxColumns;
      }
      const width = entry.contentRect.width;
      const gap =
        parsePx(getComputedStyle(entry.target).columnGap) || DEFAULT_COLUMN_GAP;
      const columns = Math.floor((width + gap) / (MIN_COLUMN_WIDTH + gap));
      return clamp(columns, 1, maxColumns);
    },
  });
