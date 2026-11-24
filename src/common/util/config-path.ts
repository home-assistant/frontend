/** Where a value is in a config, e.g. `["actions", 0, "then", 1]`. */
export type ConfigPath = (string | number)[];

export const stringifyPath = (path: ConfigPath): string => path.join("/");

export const pathEquals = (a: ConfigPath, b: ConfigPath): boolean =>
  a.length === b.length && a.every((segment, index) => segment === b[index]);
