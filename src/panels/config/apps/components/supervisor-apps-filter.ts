import type { IFuseOptions } from "fuse.js";
import Fuse from "fuse.js";
import { stripDiacritics } from "../../../../common/string/strip-diacritics";
import type { StoreAddon } from "../../../../data/supervisor/store";
import { normalizingGetFn } from "../../../../resources/fuseMultiTerm";

export function filterAndSort(addons: StoreAddon[], filter: string) {
  const options: IFuseOptions<StoreAddon> = {
    keys: ["name", "description", "slug"],
    isCaseSensitive: false,
    minMatchCharLength: Math.min(filter.length, 2),
    threshold: 0.2,
    ignoreDiacritics: true,
    getFn: normalizingGetFn,
  };
  const fuse = new Fuse(addons, options);
  return fuse.search(stripDiacritics(filter)).map((result) => result.item);
}
