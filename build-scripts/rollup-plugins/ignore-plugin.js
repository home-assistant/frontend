module.exports = function (userOptions = {}) {
  // Files need to be absolute paths.
  // This only works if the file has no exports
  // and only is imported for its side effects
  const files = userOptions.files || [];

  if (files.length === 0) {
    return {
      name: "ignore",
    };
  }

  return {
    name: "ignore",

    load(id) {
      return files.some((toIgnorePath) => id.startsWith(toIgnorePath))
        ? {
            code: "",
          }
        : null;
    },
  };
};
