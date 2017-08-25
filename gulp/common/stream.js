const stream = require('stream');

const gutil = require('gulp-util');

function streamFromString(filename, string) {
  var src = stream.Readable({ objectMode: true });
  src._read = function () {
    this.push(new gutil.File({
      cwd: '',
      base: '',
      path: filename,
      contents: new Buffer(string)
    }));
    this.push(null);
  };
  return src;
}

module.exports = {
  streamFromString,
};
