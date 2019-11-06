export const applyPatch = (data, path, value) => {
  if (path.length === 1) {
    data[path[0]] = value;
  } else {
    if (!data[path[0]]) {
      data[path[0]] = {};
    }
    return applyPatch(data[path[0]], path.slice(1), value);
  }
};

export const getPath = (data, path) => {
  if (path.length === 1) {
    return data[path[0]];
  } else {
    if (data[path[0]] === undefined) {
      return undefined;
    }
    return getPath(data[path[0]], path.slice(1));
  }
};
