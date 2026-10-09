import { describe, expect, it } from "vitest";
import type { MediaPlayerEntity } from "../../src/data/media-player";
import {
  computeMediaControls,
  MediaPlayerEntityFeature,
} from "../../src/data/media-player";

const player = (
  state: string,
  supported_features: number,
  attributes: Partial<MediaPlayerEntity["attributes"]> = {}
): MediaPlayerEntity =>
  ({
    entity_id: "media_player.test",
    state,
    attributes: { supported_features, ...attributes },
    last_changed: "",
    last_updated: "",
    context: { id: "", parent_id: null, user_id: null },
  }) as MediaPlayerEntity;

const features = (...flags: number[]): number =>
  // eslint-disable-next-line no-bitwise
  flags.reduce((acc, flag) => acc | flag, 0);

const PLAY_PAUSE_STOP = features(
  MediaPlayerEntityFeature.PLAY,
  MediaPlayerEntityFeature.PAUSE,
  MediaPlayerEntityFeature.STOP
);

const actions = (stateObj: MediaPlayerEntity, extended: boolean) =>
  computeMediaControls(stateObj, extended)?.map((c) => c.action);

describe("computeMediaControls stop button", () => {
  it.each([
    { state: "playing", extended: true, main: "media_pause" },
    { state: "playing", extended: false, main: "media_pause" },
    { state: "paused", extended: true, main: "media_play" },
    { state: "paused", extended: false, main: "media_play" },
  ])(
    "adds stop next to play/pause when $state (extended: $extended)",
    ({ state, extended, main }) => {
      expect(actions(player(state, PLAY_PAUSE_STOP), extended)).toEqual([
        main,
        "media_stop",
      ]);
    }
  );

  it("does not add stop when already stopped", () => {
    expect(actions(player("idle", PLAY_PAUSE_STOP), true)).toEqual([
      "media_play",
    ]);
  });

  it("uses stop as the main button without duplicating it when pause is unsupported", () => {
    expect(
      actions(
        player(
          "playing",
          features(MediaPlayerEntityFeature.PLAY, MediaPlayerEntityFeature.STOP)
        ),
        true
      )
    ).toEqual(["media_stop"]);
  });

  it("does not duplicate stop for assumed state players", () => {
    expect(
      actions(player("playing", PLAY_PAUSE_STOP, { assumed_state: true }), true)
    ).toEqual(["media_play", "media_pause", "media_stop"]);
  });
});
