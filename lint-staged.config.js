module.exports = {
  "*.ts": () => "tsc -p tsconfig.json",
  "*.{js,ts}": "eslint --fix",
  "!(/translations)*.{js,ts,json,css,md,html}": "prettier --write",
};
