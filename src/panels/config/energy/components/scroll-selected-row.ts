import { scrollRowIntoView } from "../../automation/scroll-row-into-view";

/**
 * Brings the row edited in the sidebar into view, once the bottom sheet on
 * narrow screens made room for it.
 */
export const scrollSelectedRowIntoView = (root: ParentNode) => {
  window.setTimeout(() => {
    const row = root.querySelector("ha-automation-row[selected]");
    const card = row?.closest("ha-card");
    if (card) {
      scrollRowIntoView(card);
    }
  }, 180);
};
