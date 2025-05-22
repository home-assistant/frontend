import type { IFuseOptions } from "fuse.js";
import Fuse from "fuse.js";
import type { StoreAddon } from "../../../src/data/supervisor/store";

export function filterAndSort(addons: StoreAddon[], filter: string) {
  const options: IFuseOptions<StoreAddon> = {
    keys: ["name", "description", "slug"],
    isCaseSensitive: false,
    minMatchCharLength: Math.min(filter.length, 2),
    threshold: 0.2,
    ignoreDiacritics: true,
  };
  const fuse = new Fuse(addons, options);
  return fuse.search(filter).map((result) => result.item);
}
