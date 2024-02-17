import { ItemPath } from "../../types";

function findNestedItem(
  obj: any,
  path: ItemPath,
  createNonExistingPath?: boolean
): any {
  return path.reduce((ac, p, index, array) => {
    if (ac === undefined) return undefined;
    if (!ac[p] && createNonExistingPath) {
      const nextP = array[index + 1];
      // Create object or array depending on next path
      if (nextP === undefined || typeof nextP === "number") {
        ac[p] = [];
      } else {
        ac[p] = {};
      }
    }
    return ac[p];
  }, obj);
}

export function nestedArrayMove<T>(
  obj: T | T[],
  oldIndex: number,
  newIndex: number,
  oldPath?: ItemPath,
  newPath?: ItemPath
): T | T[] {
  const newObj = Array.isArray(obj) ? [...obj] : { ...obj };
  const from = oldPath ? findNestedItem(newObj, oldPath) : newObj;
  const to = newPath ? findNestedItem(newObj, newPath, true) : newObj;

  if (!Array.isArray(from) || !Array.isArray(to)) {
    return obj;
  }

  const item = from.splice(oldIndex, 1)[0];
  to.splice(newIndex, 0, item);

  return newObj;
}

export function arrayMove<T = any>(
  array: T[],
  oldIndex: number,
  newIndex: number
): T[] {
  const newArray = [...array];
  const [item] = newArray.splice(oldIndex, 1);
  newArray.splice(newIndex, 0, item);
  return newArray;
}
