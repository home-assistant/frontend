#! /usr/bin/env node

var fs = require('fs');
var path = require('path');

var content = `
console.warn('Service worker disabled in dev mode');
`;

fs.writeFileSync(path.join('build', 'service_worker.js'), content);
