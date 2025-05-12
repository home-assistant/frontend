export default {
  "*.?(c|m){js,ts}": [
    "eslint --flag unstable_config_lookup_from_file --cache --cache-strategy=content --cache-location=node_modules/.cache/eslint/.eslintcache --fix",
    "prettier --cache --write",
    "lit-analyzer --quiet",
  ],
  "*.{json,css,md,markdown,html,ya?ml}": "prettier --cache --write",
  "translations/*/*.json": (files) =>
    'printf "%s\n" "Translation files should not be added or modified here. Instead, make the necessary modifications in src/translations/en.json. Other languages are managed externally. Please see https://developers.home-assistant.io/docs/translations/ for details." ' +
    files.join(" ") +
    " >&2 && exit 1",
  "yarn.lock": () => "yarn dedupe",
};
