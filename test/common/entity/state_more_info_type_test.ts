import { assert } from "chai";

import { stateMoreInfoType } from "../../../src/dialogs/more-info/state_more_info_control";

describe("stateMoreInfoType", () => {
  it("Returns media_player for media_player states", () => {
    const stateObj: any = {
      entity_id: "media_player.bla",
    };
    assert.strictEqual(stateMoreInfoType(stateObj), "media_player");
  });

  it("Returns hidden for input_select states", () => {
    const stateObj: any = {
      entity_id: "input_select.bla",
      attributes: {},
    };
    assert.strictEqual(stateMoreInfoType(stateObj), "hidden");
  });

  it("Returns default for tts states", () => {
    const stateObj: any = {
      entity_id: "tts.bla",
      attributes: {},
    };
    assert.strictEqual(stateMoreInfoType(stateObj), "default");
  });
});
