const gulpif = require('gulp-if');
const babel = require('gulp-babel');
const { gulp: cssSlam } = require('css-slam');
const htmlMinifier = require('gulp-html-minifier');
const { HtmlSplitter } = require('polymer-build');
const pump = require('pump');

const uglify = require('./gulp-uglify.js');

module.exports.minifyStream = function (stream, es6) {
  const sourcesHtmlSplitter = new HtmlSplitter();
  return pump([
    stream,
    sourcesHtmlSplitter.split(),
    gulpif(!es6, gulpif(/[^app]\.js$/, babel({
      sourceType: 'script',
      presets: [
        ['es2015', { modules: false }]
      ]
    }))),
    gulpif(/\.js$/, uglify(es6, { sourceMap: false })),
    gulpif(/\.css$/, cssSlam()),
    gulpif(/\.html$/, cssSlam()),
    gulpif(/\.html$/, htmlMinifier({
      collapseWhitespace: true,
      removeComments: true
    })),
    sourcesHtmlSplitter.rejoin(),
  ], (error) => {
    if (error) console.log(error);
  });
};
