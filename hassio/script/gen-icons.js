#!/usr/bin/env node
const fs = require("fs");
const {
  findIcons,
  generateIconset,
  genMDIIcons,
} = require("../../gulp/tasks/gen-icons.js");

const MENU_BUTTON_ICON = "menu";

function genHassioIcons() {
  const iconNames = findIcons("./src", "hassio").concat(MENU_BUTTON_ICON);
  fs.writeFileSync("./hassio-icons.html", generateIconset("hassio", iconNames));
}

genMDIIcons();
genHassioIcons();
