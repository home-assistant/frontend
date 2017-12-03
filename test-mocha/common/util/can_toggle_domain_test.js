import canToggleDomain from '../../../js/common/util/can_toggle_domain';

const assert = require('assert');

describe('canToggleDomain', () => {
  const hass = {
    config: {
      services: {
        light: {
          turn_on: null, // Service keys only need to be present for test
          turn_off: null,
        },
        lock: {
          lock: null,
          unlock: null,
        },
        sensor: {
          custom_service: null,
        },
      },
    },
  };

  it('Detects lights toggle', () => {
    assert.strictEqual(canToggleDomain(hass, 'light'), true);
  });

  it('Detects locks toggle', () => {
    assert.strictEqual(canToggleDomain(hass, 'lock'), true);
  });

  it('Detects sensors do not toggle', () => {
    assert.strictEqual(canToggleDomain(hass, 'sensor'), false);
  });

  it('Detects binary sensors do not toggle', () => {
    assert.strictEqual(canToggleDomain(hass, 'binary_sensor'), false);
  });
});
