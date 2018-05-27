#!/usr/bin/env node
const fs = require('fs');
const {
  findIcons,
  generateIconset,
} = require('../../gulp/tasks/gen-icons.js');

function genHassIcons() {
  const iconNames = findIcons('./src', 'hassio');
  fs.writeFileSync('./hassio-icons.html', generateIconset('hassio', iconNames));
}

genHassIcons();
