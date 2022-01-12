module.exports = {
  "*.{js,ts}": 'eslint --ignore-pattern "**/build-scripts/**/*.js" --fix',
  "!(/translations)*.{js,ts,json,css,md,html}": "prettier --write",
};
