import { assert } from 'chai';

import stateMoreInfoType from '../../../src/common/entity/state_more_info_type.js';

describe('stateMoreInfoType', () => {
  it('Returns media_player for media_player states', () => {
    const stateObj = {
      entity_id: 'media_player.bla',
    };
    assert.strictEqual(stateMoreInfoType(stateObj), 'media_player');
  });

  it('Returns hidden for input_select states', () => {
    const stateObj = {
      entity_id: 'input_select.bla',
      attributes: {},
    };
    assert.strictEqual(stateMoreInfoType(stateObj), 'hidden');
  });

  it('Returns default for switch states', () => {
    const stateObj = {
      entity_id: 'switch.bla',
      attributes: {},
    };
    assert.strictEqual(stateMoreInfoType(stateObj), 'default');
  });
});
