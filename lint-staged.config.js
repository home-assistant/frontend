export default {
  "*.?(c|m){js,ts}": [
    "eslint --cache --cache-strategy=content --cache-location=node_modules/.cache/eslint/.eslintcache --fix",
    "prettier --cache --write",
  ],
  "*.{json,css,md,markdown,html,y?aml}": "prettier --cache --write",
  "translations/*/*.json": (files) =>
    'printf "%s\n" "Translation files should not be added or modified here. Instead, make the necessary modifications in src/translations/en.json. Other languages are managed externally. Please see https://developers.home-assistant.io/docs/translations/ for details." ' +
    files.join(" ") +
    " >&2 && exit 1",
  "yarn.lock": () => "yarn dedupe",
};
