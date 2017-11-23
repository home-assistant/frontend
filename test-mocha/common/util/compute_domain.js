import computeDomain from '../../../js/common/util/compute_domain';

const assert = require('assert');

describe('computeDomain', () => {
  it('Detects sensor domain', () => {
    const stateObj = {
      entity_id: 'sensor.test',
    };
    assert.strictEqual(computeDomain(stateObj), 'sensor');
  });
});
