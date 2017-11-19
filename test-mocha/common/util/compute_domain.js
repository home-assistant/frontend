import computeDomain from '../../../js/common/util/compute_domain';

const assert = require('assert');

describe('computeDomain', function() {
  it('Detects sensor domain', function() {
    const stateObj = {
      entity_id: 'sensor.test',
    };
    assert.strictEqual(computeDomain(stateObj), 'sensor');
  });
});
