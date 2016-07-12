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

var toProcess = [
  {
    source: 'src/home-assistant.html',
    output: 'frontend.html',
    vulcan: new Vulcanize({
      stripExcludes: [
        'bower_components/font-roboto/roboto.html',
      ],
      inlineScripts: true,
      inlineCss: true,
      implicitStrip: true,
      stripComments: true,
    }),
  },
  {
    source: 'src/layouts/partial-map.html',
    output: 'partial-map.html',
    vulcan: new Vulcanize({
      stripExcludes: [
        'bower_components/polymer/polymer.html',
        'bower_components/paper-toolbar/paper-toolbar.html',
        'bower_components/paper-icon-button/paper-icon-button.html',
        'bower_components/iron-icon/iron-icon.html',
        'bower_components/iron-image/iron-image.html',
      ],
      inlineScripts: true,
      inlineCss: true,
      implicitStrip: true,
      stripComments: true,
    }),
  },
];

toProcess.forEach(function (info) {
  info.vulcan.process(info.source, function (err, inlinedHtml) {
    if (err !== null) {
      console.error(info.source, err);
      return;
    }

    fs.writeFileSync('build/' + info.output, minifyHTML(inlinedHtml));
  });
});
