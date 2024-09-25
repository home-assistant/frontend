export function updateNestedObject<T = any>(
  obj: T,
  path: (number | string)[],
  value: any
): T {
  if (path.length === 0) return value;
  const newObj = (Array.isArray(obj) ? [...obj] : { ...obj }) as T;
  const key = path[0];
  newObj[key] = updateNestedObject(obj[key], path.slice(1), value);
  return newObj;
}

export function findNestedObject(obj: any, path: (number | string)[]) {
  if (path.length === 0) return obj;
  const key = path[0];
  return findNestedObject(obj[key], path.slice(1));
}
