import computeStateDomain from '../../../js/common/util/compute_state_domain.js';

const assert = require('assert');

describe('computeStateDomain', () => {
  it('Detects sensor domain', () => {
    const stateObj = {
      entity_id: 'sensor.test',
    };
    assert.strictEqual(computeStateDomain(stateObj), 'sensor');
  });
});
