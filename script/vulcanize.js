#! /usr/bin/env node

var Vulcanize = require('vulcanize');
var minify = require('html-minifier');
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

const vulcan = new Vulcanize({
  inlineScripts: true,
  inlineCss: true,
  implicitStrip: true,
  stripComments: true,
  stripExcludes: [
    'bower_components/polymer/polymer.html',
  ],
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
  });
});

function process(entry) {
  console.log('Processing', entry.source);
  const vulc = entry.vulcan || vulcan;
  vulc.process(entry.source, (err, inlinedHtml) => {
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

process(toProcess.pop());
