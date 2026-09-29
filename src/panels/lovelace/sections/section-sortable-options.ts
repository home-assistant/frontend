import type { HaSortableOptions } from "../../../components/ha-sortable";

// Fallback dragging resolves drop targets through the sections' shadow roots.
export const SECTION_SORTABLE_OPTIONS: HaSortableOptions = {
  forceFallback: true,
  fallbackOnBody: true,
};
