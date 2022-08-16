module.exports = {
  "*.{js,ts}": [
    "prettier --write",
    'eslint --ignore-pattern "**/build-scripts/**/*.js" --fix',
  ],
  "!(/translations)*.{json,css,md,html}": "prettier --write",
  "translations/*/*.json": (files) =>
    'printf "%s\n" "These files should not be modified.  Instead, make the necessary modifications in src/translations/en.json.  Please see translations/README.md for details." ' +
    files.join(" ") +
    " >&2 && exit 1",
};
