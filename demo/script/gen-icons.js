#!/usr/bin/env node
const fs = require("fs");
const {
  findIcons,
  generateIconset,
  genMDIIcons,
} = require("../../gulp/tasks/gen-icons.js");

const INFO_OUTLINE = "information-outline";

function genHademoIcons() {
  const iconNames = findIcons("./src", "hademo").concat(INFO_OUTLINE);
  fs.writeFileSync("./hademo-icons.html", generateIconset("hademo", iconNames));
}

genMDIIcons();
genHademoIcons();
