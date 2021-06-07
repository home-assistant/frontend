module.exports = {
  "*.{js,ts}": "eslint --fix",
  "!(/translations)*.{js,ts,json,css,md,html}": "prettier --write",
};
