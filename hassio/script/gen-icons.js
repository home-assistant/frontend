#!/usr/bin/env node
const fs = require("fs");
const {
  findIcons,
  generateIconset,
  genMDIIcons,
} = require("../../build-scripts/gulp/gen-icons.js");

function genHassioIcons() {
  const iconNames = findIcons("./src", "hassio");

  for (const item of findIcons("../src", "hassio")) {
    iconNames.add(item);
  }

  fs.writeFileSync("./hassio-icons.html", generateIconset("hassio", iconNames));
}

genMDIIcons();
genHassioIcons();
