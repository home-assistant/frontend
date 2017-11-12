const fs = require('fs');
const crypto = require('crypto');

module.exports = function md5(filename) {
  return crypto.createHash('md5')
    .update(fs.readFileSync(filename)).digest('hex');
};

