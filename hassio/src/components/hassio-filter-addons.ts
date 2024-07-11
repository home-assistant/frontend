import type { IFuseOptions } from "fuse.js";
import Fuse from "fuse.js";
import { stripDiacritics } from "../../../src/common/string/strip-diacritics";
import { StoreAddon } from "../../../src/data/supervisor/store";
import { getStripDiacriticsFn } from "../../../src/util/fuse";

export function filterAndSort(addons: StoreAddon[], filter: string) {
  const options: IFuseOptions<StoreAddon> = {
    keys: ["name", "description", "slug"],
    isCaseSensitive: false,
    minMatchCharLength: Math.min(filter.length, 2),
    threshold: 0.2,
    getFn: getStripDiacriticsFn,
  };
  const fuse = new Fuse(addons, options);
  return fuse.search(stripDiacritics(filter)).map((result) => result.item);
}
