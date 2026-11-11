/** Where a value is in a config, e.g. `["actions", 0, "then", 1]`. */
export type ConfigPath = (string | number)[];

export const stringifyPath = (path: ConfigPath): string => path.join("/");

export const pathEquals = (a: ConfigPath, b: ConfigPath): boolean =>
  a.length === b.length && a.every((segment, index) => segment === b[index]);

export const pathStartsWith = (path: ConfigPath, prefix: ConfigPath): boolean =>
  prefix.length <= path.length &&
  prefix.every((segment, index) => segment === path[index]);

/** Formats a path the way it reads in YAML, e.g. `actions[1].then[0].delay`. */
export const formatPath = (path: ConfigPath): string =>
  path
    .map((segment, index) =>
      typeof segment === "number"
        ? `[${segment}]`
        : index === 0
          ? segment
          : `.${segment}`
    )
    .join("");
