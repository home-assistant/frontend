import Fuse from "fuse.js";
import type { IFuseOptions } from "fuse.js";
import { StoreAddon } from "../../../src/data/supervisor/store";

export function filterAndSort(addons: StoreAddon[], filter: string) {
  const options: IFuseOptions<StoreAddon> = {
    keys: ["name", "description", "slug"],
    isCaseSensitive: false,
    minMatchCharLength: 2,
    threshold: 0.2,
  };
  const fuse = new Fuse(addons, options);
  return fuse.search(filter).map((result) => result.item);
}
