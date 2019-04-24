import { HassioAddonInfo } from "../../../src/data/hassio";
import * as Fuse from "fuse.js";

export function filterAndSort(addons, filter) {
  if (!filter) {
    return addons.sort((a, b) =>
      a.name.toUpperCase() < b.name.toUpperCase() ? -1 : 1
    );
  }

  const options: Fuse.FuseOptions<HassioAddonInfo> = {
    keys: ["name", "description", "slug"],
    caseSensitive: false,
    minMatchCharLength: 2,
    threshold: 0.2,
  };
  const fuse = new Fuse(addons, options);
  return fuse.search(filter);
}
