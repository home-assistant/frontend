export const applyPatch = (data, path, value): void => {
  if (path.length === 1) {
    data[path[0]] = value;
    return;
  }
  if (!data[path[0]]) {
    data[path[0]] = {};
  }
  // eslint-disable-next-line consistent-return
  return applyPatch(data[path[0]], path.slice(1), value);
};

export const getPath = (data, path): any | undefined => {
  if (path.length === 1) {
    return data[path[0]];
  }
  if (data[path[0]] === undefined) {
    return undefined;
  }
  return getPath(data[path[0]], path.slice(1));
};
