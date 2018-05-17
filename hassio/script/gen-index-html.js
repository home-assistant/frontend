#!/usr/bin/env node
const fs = require('fs');
const config = require('../config.js');

let index = fs.readFileSync('index.html', 'utf-8');

const toReplace = [
  [
    '<!--EXTRA_SCRIPTS-->',
    "<script src='/frontend_es5/custom-elements-es5-adapter.js'></script>"
  ],
];

for (item of toReplace) {
  index = index.replace(item[0], item[1]);
}

fs.writeFileSync(`${config.buildDir}/index.html`, index);
