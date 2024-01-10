import { ItemPath } from "../../types";

export function nestedArrayMove<T = any>(
  obj: T[],
  oldIndex: number,
  newIndex: number,
  oldPath?: ItemPath,
  newPath?: ItemPath
): T[] {
  const clonedObj = obj.concat();

  const fromObj = oldPath
    ? oldPath.reduce((ac, path) => ac[path], clonedObj)
    : clonedObj;

  const toObj = newPath
    ? newPath.reduce((ac, path, index) => {
        if (!ac[path]) {
          const nextPath = newPath![index + 1];
          // Create object or array depending on next path
          if (nextPath === undefined || typeof nextPath === "number") {
            ac[path] = [];
          } else {
            ac[path] = {};
          }
        }
        return ac[path];
      }, clonedObj)
    : clonedObj;

  if (!fromObj || !toObj) {
    return obj;
  }

  const item = fromObj.splice(oldIndex, 1)[0];
  toObj.splice(newIndex, 0, item);

  return clonedObj;
}
