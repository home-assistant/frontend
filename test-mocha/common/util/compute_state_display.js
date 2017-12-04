import { assert } from 'chai';

import computeStateDisplay from '../../../js/common/util/compute_state_display';

describe('computeStateDisplay', () => {
  const haLocalize = function (namespace, message, ...args) {
    // Mock Localize function for testing
    return namespace + '.' + message + (args.length ? ': ' + args.join(',') : '');
  };

  it('Localizes binary sensor defaults', () => {
    const stateObj = {
      entity_id: 'binary_sensor.test',
      state: 'off',
      attributes: {
      },
    };
    assert.strictEqual(computeStateDisplay(haLocalize, stateObj, 'en'), 'state.binary_sensor.default.off');
  });

  it('Localizes binary sensor device class', () => {
    const stateObj = {
      entity_id: 'binary_sensor.test',
      state: 'off',
      attributes: {
        device_class: 'moisture',
      },
    };
    assert.strictEqual(computeStateDisplay(haLocalize, stateObj, 'en'), 'state.binary_sensor.moisture.off');
  });

  it('Localizes binary sensor invalid device class', () => {
    const altHaLocalize = function (namespace, message, ...args) {
      if (namespace === 'state.binary_sensor.invalid_device_class') return null;
      return haLocalize(namespace, message, ...args);
    };
    const stateObj = {
      entity_id: 'binary_sensor.test',
      state: 'off',
      attributes: {
        device_class: 'invalid_device_class',
      },
    };
    assert.strictEqual(computeStateDisplay(altHaLocalize, stateObj, 'en'), 'state.binary_sensor.default.off');
  });

  it('Localizes sensor value with units', () => {
    const stateObj = {
      entity_id: 'sensor.test',
      state: '123',
      attributes: {
        unit_of_measurement: 'm',
      },
    };
    assert.strictEqual(computeStateDisplay(haLocalize, stateObj, 'en'), '123 m');
  });

  it('Localizes input_datetime with full date time', () => {
    const stateObj = {
      entity_id: 'input_datetime.test',
      state: '123',
      attributes: {
        has_date: true,
        has_time: true,
        year: 2017,
        month: 11,
        day: 18,
        hour: 11,
        minute: 12,
        second: 13,
      },
    };
    assert.strictEqual(computeStateDisplay(haLocalize, stateObj, 'en'), 'November 18, 2017, 11:12 AM');
  });

  it('Localizes input_datetime with date', () => {
    const stateObj = {
      entity_id: 'input_datetime.test',
      state: '123',
      attributes: {
        has_date: true,
        has_time: false,
        year: 2017,
        month: 11,
        day: 18,
        hour: 11,
        minute: 12,
        second: 13,
      },
    };
    assert.strictEqual(computeStateDisplay(haLocalize, stateObj, 'en'), 'November 18, 2017');
  });

  it('Localizes input_datetime with time', () => {
    const stateObj = {
      entity_id: 'input_datetime.test',
      state: '123',
      attributes: {
        has_date: false,
        has_time: true,
        year: 2017,
        month: 11,
        day: 18,
        hour: 11,
        minute: 12,
        second: 13,
      },
    };
    assert.strictEqual(computeStateDisplay(haLocalize, stateObj, 'en'), '11:12 AM');
  });

  it('Localizes zwave ready', () => {
    const stateObj = {
      entity_id: 'zwave.test',
      state: 'ready',
      attributes: {
        query_stage: 'Complete',
      },
    };
    assert.strictEqual(computeStateDisplay(haLocalize, stateObj, 'en'), 'state.zwave.default.ready');
  });

  it('Localizes zwave initializing', () => {
    const stateObj = {
      entity_id: 'zwave.test',
      state: 'initializing',
      attributes: {
        query_stage: 'Probe',
      },
    };
    assert.strictEqual(computeStateDisplay(haLocalize, stateObj, 'en'), 'state.zwave.query_stage.initializing: query_stage,Probe');
  });

  it('Localizes cover open', () => {
    const stateObj = {
      entity_id: 'cover.test',
      state: 'open',
      attributes: {
      },
    };
    assert.strictEqual(computeStateDisplay(haLocalize, stateObj, 'en'), 'state.cover.open');
  });

  it('Localizes unavailable', () => {
    const altHaLocalize = function (namespace, message, ...args) {
      if (namespace === 'state.sensor') return null;
      return haLocalize(namespace, message, ...args);
    };
    const stateObj = {
      entity_id: 'sensor.test',
      state: 'unavailable',
      attributes: {
      },
    };
    assert.strictEqual(computeStateDisplay(altHaLocalize, stateObj, 'en'), 'state.default.unavailable');
  });

  it('Localizes custom state', () => {
    const altHaLocalize = function () {
      // No matches can be found
      return null;
    };
    const stateObj = {
      entity_id: 'sensor.test',
      state: 'My Custom State',
      attributes: {
      },
    };
    assert.strictEqual(computeStateDisplay(altHaLocalize, stateObj, 'en'), 'My Custom State');
  });

  it('Only calculates state display once per immutable state object', () => {
    const stateObj = {
      entity_id: 'cover.test',
      state: 'open',
      attributes: {
      },
    };
    assert.strictEqual(computeStateDisplay(haLocalize, stateObj, 'en'), 'state.cover.open');

    stateObj.state = 'closing';
    assert.strictEqual(computeStateDisplay(haLocalize, stateObj, 'en'), 'state.cover.open');
  });
});
