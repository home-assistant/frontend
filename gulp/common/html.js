const {
  Analyzer,
  FSUrlLoader
} = require('polymer-analyzer');

const Bundler = require('polymer-bundler').Bundler;
const parse5 = require('parse5');

const { streamFromString } = require('./stream');

// Bundle an HTML file and convert it to a stream
async function bundledStreamFromHTML(path, bundlerOptions = {}) {
  const bundler = new Bundler(bundlerOptions);
  const manifest = await bundler.generateManifest([path]);
  const result = await bundler.bundle(manifest);
  return streamFromString(
    path, parse5.serialize(result.documents.get(path).ast));
}

async function analyze(root, paths) {
  const analyzer = new Analyzer({
    urlLoader: new FSUrlLoader(root),
  });
  return analyzer.analyze(paths);
}

async function findDependencies(root, element) {
  const deps = new Set();

  async function resolve(files) {
    const analysis = await analyze(root, files);
    const toResolve = [];

    for (const file of files) {
      const doc = analysis.getDocument(file);

      for (const importEl of doc.getFeatures({ kind: 'import' })) {
        const url = importEl.url;
        if (!deps.has(url)) {
          deps.add(url);
          toResolve.push(url);
        }
      }
    }

    if (toResolve.length > 0) {
      return resolve(toResolve);
    }
  }

  await resolve([element]);
  return deps;
}

module.exports = {
  bundledStreamFromHTML,
  findDependencies,
};
