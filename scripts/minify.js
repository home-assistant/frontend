var minify = require('html-minifier');
var fs = require('fs');

var html = fs.readFileSync('build/frontend.vulcan.html').toString();

    // removeComments: true,
    // collapseWhitespace: true,
var minifiedHtml = minify.minify(html, {
    customAttrAssign: [/\$=/],
    "removeComments": true,
    "removeCommentsFromCDATA": true,
    "removeCDATASectionsFromCDATA": true,
    "collapseWhitespace": true,
    "collapseBooleanAttributes": true,
    "removeScriptTypeAttributes": true,
    "removeStyleLinkTypeAttributes": true,
    "minifyJS": true,
});

fs.writeFileSync('build/frontend.html', minifiedHtml);
