#! /usr/bin/env node

var Vulcanize = require('vulcanize');
var minify = require('html-minifier');
var hyd = require('hydrolysis');
var fs = require('fs');

if (!fs.existsSync('build')) {
  fs.mkdirSync('build');
}
if (!fs.existsSync('build/panels')) {
  fs.mkdirSync('build/panels');
}

function minifyHTML(html) {
  return minify.minify(html, {
    customAttrAssign: [/\$=/],
    removeComments: true,
    removeCommentsFromCDATA: true,
    removeCDATASectionsFromCDATA: true,
    collapseWhitespace: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    minifyJS: true,
    minifyCSS: true,
  });
}

const baseVulcanOptions = {
  inlineScripts: true,
  inlineCss: true,
  implicitStrip: true,
  stripComments: true,
};

const panelVulcan = new Vulcanize({
  inlineScripts: true,
  inlineCss: true,
  implicitStrip: true,
  stripComments: true,
  stripExcludes: undefined,
});

const toProcess = [
  {
    source: 'src/home-assistant.html',
    output: 'frontend.html',
    vulcan: new Vulcanize(Object.assign({}, baseVulcanOptions, {
      stripExcludes: [
        'bower_components/font-roboto/roboto.html',
      ],
    })),
  },
];

fs.readdirSync('./panels').forEach(panel => {
  toProcess.push({
    source: `panels/${panel}/ha-panel-${panel}.html`,
    output: `panels/ha-panel-${panel}.html`,
    vulcan: panelVulcan,
  });
});

function process(entry) {
  console.log('Processing', entry.source);
  entry.vulcan.process(entry.source, (err, inlinedHtml) => {
    if (err !== null) {
      console.error(entry.source, err);
      return;
    }

    const out = 'build/' + entry.output;
    console.log('Writing', out);
    fs.writeFileSync(out, minifyHTML(inlinedHtml));

    if (toProcess.length) {
      process(toProcess.pop());
    }
  });
}

// Fetch all dependencies of main app and exclude them from panels
hyd.Analyzer.analyze('src/home-assistant.html')
    .then(function (analyzer) {
      return analyzer._getDependencies('src/home-assistant.html');
    })
    .then(deps => { panelVulcan.stripExcludes = deps; })
    // And then start vulcanizing!!
    .then(() => process(toProcess.pop()));
