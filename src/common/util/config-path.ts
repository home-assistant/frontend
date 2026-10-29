export type ConfigPath = (string | number)[];

const isContainer = (value: unknown): value is object =>
  typeof value === "object" && value !== null;

export const pathEquals = (a: ConfigPath, b: ConfigPath): boolean =>
  a.length === b.length && a.every((segment, index) => segment === b[index]);

export const pathStartsWith = (path: ConfigPath, prefix: ConfigPath) =>
  prefix.length <= path.length &&
  prefix.every((segment, index) => path[index] === segment);

export const getAtPath = (root: unknown, path: ConfigPath): unknown =>
  path.reduce<unknown>(
    (node, segment) =>
      isContainer(node)
        ? (node as Record<string, unknown>)[segment]
        : undefined,
    root
  );

/**
 * Immutably replaces the value at `path`, copying only the containers along it.
 * An `undefined` value removes an object key instead of storing `undefined`.
 * `onCopy` sees every copied container next to its original.
 */
export const setAtPath = <T>(
  root: T,
  path: ConfigPath,
  value: unknown,
  onCopy?: (original: object, copy: object) => void
): T => {
  if (path.length === 0) {
    return value as T;
  }
  const [segment, ...rest] = path;
  const node: unknown = root;
  const copy = (
    Array.isArray(node) ? node.slice() : { ...(isContainer(node) ? node : {}) }
  ) as Record<string | number, unknown>;
  const child = setAtPath(
    isContainer(node) ? (node as Record<string, unknown>)[segment] : undefined,
    rest,
    value,
    onCopy
  );
  if (child === undefined && !Array.isArray(node)) {
    delete copy[segment];
  } else {
    copy[segment] = child;
  }
  if (isContainer(node)) {
    onCopy?.(node, copy);
  }
  return copy as T;
};
