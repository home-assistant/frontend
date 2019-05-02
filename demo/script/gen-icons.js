#!/usr/bin/env node
const fs = require("fs");
const {
  findIcons,
  generateIconset,
  genMDIIcons,
} = require("../../build-scripts/gulp/gen-icons.js");

function genHademoIcons() {
  const iconNames = findIcons("./src", "hademo");
  fs.writeFileSync("./hademo-icons.html", generateIconset("hademo", iconNames));
}

genMDIIcons();
genHademoIcons();
