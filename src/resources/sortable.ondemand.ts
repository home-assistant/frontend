let loaded: typeof import("./sortable").default;

export type { SortableInstance } from "./sortable";
export const loadSortable = async (): Promise<
  typeof import("./sortable").default
> => {
  if (!loaded) {
    loaded = (await import("./sortable")).default;
  }
  return loaded;
};
