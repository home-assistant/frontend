import { assert } from "chai";
import { useFakeTimers } from "sinon";

import { timerTimeRemaining } from "../../../src/data/timer";

describe("timerTimeRemaining", () => {
  it("works with idle timers", () => {
    assert.strictEqual(
      timerTimeRemaining({
        state: "idle",
        attributes: {
          remaining: "0:01:05",
        },
      } as any),
      65
    );
  });

  it("works with paused timers", () => {
    assert.strictEqual(
      timerTimeRemaining({
        state: "paused",
        attributes: {
          remaining: "0:01:05",
        },
      } as any),
      65
    );
  });

  describe("active timers", () => {
    let clock;
    beforeEach(() => {
      clock = useFakeTimers(new Date("2018-01-17T16:15:30Z"));
    });
    afterEach(() => {
      clock.restore();
    });
    it("works", () => {
      assert.strictEqual(
        timerTimeRemaining({
          state: "active",
          attributes: {
            remaining: "0:01:05",
          },
          last_changed: "2018-01-17T16:15:12Z",
        } as any),
        47
      );
    });
  });
});
