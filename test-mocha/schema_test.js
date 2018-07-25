import Ajv from 'ajv';
import pack from 'ajv-pack';
import schema from '../src/panels/lovelace/schema.json';

describe('Lovelace schema', () => {
  let ajv;

  beforeEach(() => {
    ajv = new Ajv({ sourceCode: true });
  });

  it('valid by ajv', () => {
    ajv.compile(schema);
  });

  it('valid by ajv-pack', () => {
    const validate = ajv.compile(schema);
    pack(ajv, validate);
  });
});
