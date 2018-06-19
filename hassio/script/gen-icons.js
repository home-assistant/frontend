#!/usr/bin/env node
const fs = require('fs');
const {
  findIcons,
  generateIconset,
  MENU_BUTTON_ICON
} = require('../../gulp/tasks/gen-icons.js');

function genHassioIcons() {
  const iconNames = findIcons('./src', 'hassio').concat(MENU_BUTTON_ICON);
  fs.writeFileSync('./hassio-icons.html', generateIconset('hassio', iconNames));
}

genHassioIcons();
