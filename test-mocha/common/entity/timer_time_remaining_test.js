import { assert } from 'chai';
import sinon from 'sinon';

import timerTimeRemaining from '../../../src/common/entity/timer_time_remaining.js';

describe('timerTimeRemaining', () => {
  it('works with idle timers', () => {
    assert.strictEqual(timerTimeRemaining({
      state: 'idle',
      attributes: {
        remaining: '0:01:05'
      }
    }), 65);
  });

  it('works with paused timers', () => {
    assert.strictEqual(timerTimeRemaining({
      state: 'paused',
      attributes: {
        remaining: '0:01:05'
      }
    }), 65);
  });

  describe('active timers', () => {
    let clock;
    beforeEach(() => {
      clock = sinon.useFakeTimers(new Date('2018-01-17T16:15:30Z'));
    });
    afterEach(() => {
      clock.restore();
    });
    it('works', () => {
      assert.strictEqual(timerTimeRemaining({
        state: 'active',
        attributes: {
          remaining: '0:01:05'
        },
        last_changed: '2018-01-17T16:15:12Z',
      }), 47);
    });
  });
});
