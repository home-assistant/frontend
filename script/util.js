var crypto = require('crypto');
var fs = require('fs');

function md5(filename) {
  return crypto.createHash('md5')
    .update(fs.readFileSync(filename)).digest('hex');
}

module.exports = {
  md5,
};
