/*
TODO:
 - Use gulp streams
 - Use polymer bundler to vulcanize
*/
var gulp = require('gulp');
var Vulcanize = require('vulcanize');
var minify = require('html-minifier');
var fs = require('fs');

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

const baseExcludes = [
  'bower_components/font-roboto/roboto.html',
  'bower_components/paper-styles/color.html',
];

const toProcess = [
  // This is the Hass.io configuration panel
  // It's build standalone because it is embedded in the supervisor.
  {
    source: './panels/hassio/hassio-main.html',
    output: './build-temp/hassio-main.html',
    vulcan: new Vulcanize(Object.assign({}, baseVulcanOptions, {
      stripExcludes: baseExcludes.concat([
        'bower_components/polymer/polymer.html',
        'bower_components/iron-meta/iron-meta.html',
      ]),
    })),
  },
];

function vulcanizeEntry(entry) {
  return new Promise((resolve, reject) => {
    console.log('Processing', entry.source);
    entry.vulcan.process(entry.source, (err, inlinedHtml) => {
      if (err !== null) {
        reject(`${entry.source}: ${err}`);
        return;
      }

      console.log('Writing', entry.output);
      fs.writeFileSync(entry.output, minifyHTML(inlinedHtml));
      resolve();
    });
  });
}

gulp.task('hassio-panel', () => {
  if (!fs.existsSync('build-temp')) {
    fs.mkdirSync('build-temp');
  }

  toProcess.reduce(
        (p, entry) => p.then(() => vulcanizeEntry(entry)),
        Promise.resolve());

  return toProcess;
});
