const gulpif = require('gulp-if');

const babel = require('gulp-babel');
const uglify = require('gulp-uglify');
const { gulp: cssSlam } = require('css-slam');
const htmlMinifier = require('gulp-html-minifier');
const { HtmlSplitter } = require('polymer-build');

module.exports.minifyStream = function (stream) {
  const sourcesHtmlSplitter = new HtmlSplitter();
  return stream
    .pipe(sourcesHtmlSplitter.split())
    .pipe(gulpif(/[^app]\.js$/, babel({
      sourceType: 'script',
      presets: [
        ['es2015', { modules: false }]
      ]
    })))
    .pipe(gulpif(/\.js$/, uglify({ sourceMap: false })))
    .pipe(gulpif(/\.css$/, cssSlam()))
    .pipe(gulpif(/\.html$/, cssSlam()))
    .pipe(gulpif(/\.html$/, htmlMinifier({
      collapseWhitespace: true,
      removeComments: true
    })))
    .pipe(sourcesHtmlSplitter.rejoin());
};
