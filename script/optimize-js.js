#!/usr/bin/env node

var fs = require('fs');
var optimizeJs = require('optimize-js');

var core = fs.readFileSync('build/core.js', 'utf-8');
core = optimizeJs(core);
fs.writeFileSync('build/core.js', core);

var compatibility = fs.readFileSync('build/compatibility.js', 'utf-8');
compatibility = optimizeJs(compatibility);
fs.writeFileSync('build/compatibility.js', compatibility);
