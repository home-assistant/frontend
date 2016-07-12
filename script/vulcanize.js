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
  {
    source: 'src/layouts/partial-map.html',
    output: 'partial-map.html',
    vulcan: new Vulcanize(Object.assign({}, baseVulcanOptions, {
      stripExcludes: [
        'bower_components/polymer/polymer.html',
        'bower_components/paper-toolbar/paper-toolbar.html',
        'bower_components/paper-icon-button/paper-icon-button.html',
        'bower_components/iron-icon/iron-icon.html',
        'bower_components/iron-image/iron-image.html',
      ],
    })),
  },
  {
    source: 'src/entry-points/dev-tools.html',
    output: 'dev-tools.html',
    vulcan: new Vulcanize(Object.assign({}, baseVulcanOptions, {
      stripExcludes: [
        'bower_components/polymer/polymer.html',
        'bower_components/paper-button/paper-button.html',
        'bower_components/paper-input/paper-input.html',
        'bower_components/paper-icon-button/paper-icon-button.html',
        'bower_components/paper-spinner/paper-spinner.html',
        'bower_components/paper-toolbar/paper-toolbar.html',
        'bower_components/paper-menu/paper-menu.html',
        'bower_components/paper-scroll-header-panel/paper-scroll-header-panel.html',
      ],
    })),
  },
];

toProcess.forEach(info => {
  info.vulcan.process(info.source, (err, inlinedHtml) => {
    if (err !== null) {
      console.error(info.source, err);
      return;
    }

    fs.writeFileSync('build/' + info.output, minifyHTML(inlinedHtml));
  });
});
