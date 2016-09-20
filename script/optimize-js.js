#!/usr/bin/env node

var fs = require('fs');
var optimizeJs = require('optimize-js');

var core = fs.readFileSync('build/core.js', 'utf-8');
core = optimizeJs(core);
fs.writeFileSync('build/core.js', core);
