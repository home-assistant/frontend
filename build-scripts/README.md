# Bundling Home Assistant Frontend

The Home Assistant build pipeline contains various steps to prepare a build.

- Generating icon files to be included
- Generating translation files to be included
- Converting TypeScript, CSS and JSON files to JavaScript
- Bundling
- Minifying the files
- Generating the HTML entrypoint files
- Generating the service worker
- Compressing the files

## Converting files

Currently in Home Assistant we use a bundler to convert TypeScript, CSS and JSON files to JavaScript files that the browser understands.

We currently rely on Webpack but also have experimental Rollup support. Both of these programs bundle the converted files in both production and development.

For development, bundling is optional. We just want to get the right files in the browser.

Responsibilities of the converter during development:

- Convert TypeScript to JavaScript
- Convert CSS to JavaScript that sets the content as the default export
- Convert JSON to JavaScript that sets the content as the default export
- Make sure import, dynamic import and web worker references work
  - Add extensions where missing
  - Resolve absolute package imports
- Filter out specific imports/packages
- Replace constants with values

In production, the following responsibilities are added:

- Minify HTML
- Bundle multiple imports so that the browser can fetch less files
- Generate a second version that is ES5 compatible

Configuration for all these steps are specified in [bundle.js](bundle.js).
