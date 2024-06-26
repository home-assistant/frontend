import Fuse from "fuse.js";
import { stripDiacritics } from "../common/string/strip-diacritics";

type GetFn = typeof Fuse.config.getFn;

export const getStripDiacriticsFn: GetFn = (obj, path) => {
  const value = Fuse.config.getFn(obj, path);
  if (Array.isArray(value)) {
    return value.map((v) => stripDiacritics(v ?? ""));
  }
  return stripDiacritics((value as string | undefined) ?? "");
};
