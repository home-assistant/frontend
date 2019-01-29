#!/usr/bin/env node
const fs = require("fs");
const {
  findIcons,
  generateIconset,
  genMDIIcons,
} = require("../../gulp/tasks/gen-icons.js");

const MENU_BUTTON_ICON = "menu";

function genHademoIcons() {
  const iconNames = findIcons("./src", "hademo").concat(MENU_BUTTON_ICON);
  fs.writeFileSync("./hademo-icons.html", generateIconset("hademo", iconNames));
}

genMDIIcons();
genHademoIcons();
