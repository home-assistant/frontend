/**
 * UglifyJS gulp plugin that takes in a boolean to use ES or JS minification.
 */
const composer = require('gulp-uglify/composer');
const uglifyjs = require('uglify-js');
const uglifyes = require('uglify-es');

module.exports = function gulpUglify(es6, options) {
  return composer(es6 ? uglifyes : uglifyjs, console)(options);
};
