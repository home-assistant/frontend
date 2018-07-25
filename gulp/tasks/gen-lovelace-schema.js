const Ajv = require('ajv');
const ajv = new Ajv({sourceCode: true}); // this option is required
const pack = require('ajv-pack');
const path = require('path');
const fs = require('fs');
const gulp = require('gulp');

const OUTPUT_DIR = path.resolve(__dirname, '../../build');
const MDI_OUTPUT_PATH = path.resolve(OUTPUT_DIR, 'mdi.html');
const HASS_OUTPUT_PATH = path.resolve(OUTPUT_DIR, 'hass-icons.html');
const SCHEMA_LOCATION = path.resolve(__dirname, '../../src/panels/lovelace/schema.json');

function generateSchema() {
  fs.existsSync(OUTPUT_DIR) || fs.mkdirSync(OUTPUT_DIR);
  const schema = require(SCHEMA_LOCATION);
  const validate = ajv.compile(schema);
  const moduleCode = pack(ajv, validate);
  fs.writeFileSync(path.join(OUTPUT_DIR, '/lovelace_schema.js'), moduleCode);
}

gulp.task('gen-lovelace-schema', generateSchema);
