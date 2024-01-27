module.exports = function (opts = {}) {
  const dontHash = opts.dontHash || new Set();

  return {
    name: "dont-hash",
    renderChunk(_code, chunk, _options) {
      if (!chunk.isEntry || !dontHash.has(chunk.name)) {
        return null;
      }
      chunk.fileName = `${chunk.name}.js`;
      return null;
    },
  };
};
