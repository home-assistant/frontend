module.exports = {
  "*.{js,ts}": ["prettier --write", "eslint --fix"],
  "!(/translations)*.{json,css,md,html}": "prettier --write",
  "translations/*/*.json": (files) =>
    'printf "%s\n" "Translation files should not be added or modified here. Instead, make the necessary modifications in src/translations/en.json. Other languages are managed externally. Please see https://developers.home-assistant.io/docs/translations/ for details." ' +
    files.join(" ") +
    " >&2 && exit 1",
};
