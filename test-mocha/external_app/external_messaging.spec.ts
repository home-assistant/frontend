import * as assert from "assert";

import {
  ExternalMessaging,
  InternalMessage,
} from "../../src/external_app/external_messaging";

class MockExternalMessaging extends ExternalMessaging {
  public mockSent: InternalMessage[] = [];

  protected _sendExternal(msg: InternalMessage) {
    this.mockSent.push(msg);
  }
}

describe("ExternalMessaging", () => {
  let bus: MockExternalMessaging;

  beforeEach(() => {
    bus = new MockExternalMessaging();
  });

  it("Send success results", async () => {
    const sendMessageProm = bus.sendMessage({
      type: "config/get",
    });

    assert.equal(bus.mockSent.length, 1);
    assert.deepEqual(bus.mockSent[0], {
      id: 1,
      type: "config/get",
    });

    bus.receiveMessage({
      id: 1,
      type: "result",
      success: true,
      result: {
        hello: "world",
      },
    });

    const result = await sendMessageProm;
    assert.deepEqual(result, {
      hello: "world",
    });
  });

  it("Send fail results", async () => {
    const sendMessageProm = bus.sendMessage({
      type: "config/get",
    });

    bus.receiveMessage({
      id: 1,
      type: "result",
      success: false,
      error: {
        code: "no_auth",
        message: "There is no authentication.",
      },
    });

    try {
      await sendMessageProm;
      assert.fail("Should have raised");
    } catch (err) {
      assert.deepEqual(err, {
        code: "no_auth",
        message: "There is no authentication.",
      });
    }
  });
});
