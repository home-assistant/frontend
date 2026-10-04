import {
  mdiPause,
  mdiPlay,
  mdiRepeatOnce,
  mdiShuffle,
  mdiShuffleDisabled,
  mdiStop,
  mdiVolumeHigh,
  mdiVolumeOff,
} from "@mdi/js";
import { describe, expect, it } from "vitest";
import {
  computeMediaPlayerPlaybackButtons,
  getDefaultMediaPlayerControls,
  MEDIA_PLAYER_DEFAULT_CONTROLS,
} from "../../../../src/panels/lovelace/card-features/media-player-playback-controls";
import type { MediaPlayerEntity } from "../../../../src/data/media-player";
import { MediaPlayerEntityFeature } from "../../../../src/data/media-player";

const player = (
  state: string,
  attributes: Partial<MediaPlayerEntity["attributes"]> = {}
): MediaPlayerEntity =>
  ({
    entity_id: "media_player.test",
    state,
    attributes,
    last_changed: "",
    last_updated: "",
    context: { id: "", parent_id: null, user_id: null },
  }) as MediaPlayerEntity;

const features = (...flags: number[]): number =>
  // eslint-disable-next-line no-bitwise
  flags.reduce((acc, flag) => acc | flag, 0);

const ALL_FEATURES = features(
  MediaPlayerEntityFeature.TURN_ON,
  MediaPlayerEntityFeature.TURN_OFF,
  MediaPlayerEntityFeature.PLAY,
  MediaPlayerEntityFeature.PAUSE,
  MediaPlayerEntityFeature.STOP,
  MediaPlayerEntityFeature.PREVIOUS_TRACK,
  MediaPlayerEntityFeature.NEXT_TRACK,
  MediaPlayerEntityFeature.VOLUME_STEP,
  MediaPlayerEntityFeature.VOLUME_MUTE,
  MediaPlayerEntityFeature.SHUFFLE_SET,
  MediaPlayerEntityFeature.REPEAT_SET
);

type Control = Parameters<typeof computeMediaPlayerPlaybackButtons>[1][number];

// What the card shows: buttons for a player in `state` (all features unless
// overridden) configured with `controls`.
const controlsFor = (
  state: string,
  controls: readonly Control[],
  attributes: Partial<MediaPlayerEntity["attributes"]> = {}
) =>
  computeMediaPlayerPlaybackButtons(
    player(state, { supported_features: ALL_FEATURES, ...attributes }),
    controls
  );

const control = (
  state: string,
  action: Control,
  attributes: Partial<MediaPlayerEntity["attributes"]> = {}
) => controlsFor(state, [action], attributes)[0];

const isEnabled = (
  state: string,
  action: Control,
  attributes?: Partial<MediaPlayerEntity["attributes"]>
) => !control(state, action, attributes).disabled;

describe("media player playback default controls", () => {
  it("renders play when idle, pause while playing", () => {
    expect(
      controlsFor("idle", MEDIA_PLAYER_DEFAULT_CONTROLS).map((b) => b.action)
    ).toEqual([
      "turn_off",
      "media_previous_track",
      "media_play",
      "media_next_track",
    ]);
    expect(
      controlsFor("playing", MEDIA_PLAYER_DEFAULT_CONTROLS).map((b) => b.action)
    ).toEqual([
      "turn_off",
      "media_previous_track",
      "media_pause",
      "media_next_track",
    ]);
  });

  it("are all usable while playing", () => {
    expect(
      controlsFor("playing", MEDIA_PLAYER_DEFAULT_CONTROLS).every(
        (b) => !b.disabled
      )
    ).toBe(true);
  });

  it("greys out previous/next while idle but keeps play/pause", () => {
    expect(isEnabled("idle", "media_previous_track")).toBe(false);
    expect(isEnabled("idle", "media_next_track")).toBe(false);
    expect(isEnabled("idle", "media_play_pause")).toBe(true);
  });

  it("keeps the power toggle usable when off but greys out everything else", () => {
    const buttons = controlsFor("off", MEDIA_PLAYER_DEFAULT_CONTROLS);
    const power = buttons.find((b) => b.action === "turn_on");
    expect(power?.disabled).toBe(false);
    expect(buttons.filter((b) => b !== power).every((b) => b.disabled)).toBe(
      true
    );
  });

  it("greys out every control when unavailable", () => {
    expect(
      controlsFor("unavailable", MEDIA_PLAYER_DEFAULT_CONTROLS).every(
        (b) => b.disabled
      )
    ).toBe(true);
  });

  it("uses a power toggle for non-assumed and separate on/off when assumed", () => {
    const standard = getDefaultMediaPlayerControls(player("playing"));
    expect(standard).toContain("power");
    expect(standard).not.toContain("turn_on");
    expect(standard).not.toContain("turn_off");

    const assumed = getDefaultMediaPlayerControls(
      player("playing", { assumed_state: true })
    );
    expect(assumed).toContain("turn_on");
    expect(assumed).toContain("turn_off");
    expect(assumed).not.toContain("power");
  });

  it("uses separate play and pause for assumed-state players", () => {
    expect(getDefaultMediaPlayerControls(player("playing"))).toContain(
      "media_play_pause"
    );
    const assumed = getDefaultMediaPlayerControls(
      player("playing", { assumed_state: true })
    );
    expect(assumed).toContain("media_play");
    expect(assumed).toContain("media_pause");
    expect(assumed).not.toContain("media_play_pause");
  });
});

describe("media player power toggle", () => {
  it("turns on when off", () => {
    const button = control("off", "power");
    expect(button.action).toBe("turn_on");
    expect(button.disabled).toBe(false);
  });

  it("turns off when active", () => {
    const button = control("playing", "power");
    expect(button.action).toBe("turn_off");
    expect(button.disabled).toBe(false);
  });

  it("is disabled when unavailable", () => {
    expect(control("unavailable", "power").disabled).toBe(true);
  });

  it("is disabled when the resolved direction is unsupported", () => {
    // Off, but the player can only be turned off.
    expect(
      control("off", "power", {
        supported_features: MediaPlayerEntityFeature.TURN_OFF,
      }).disabled
    ).toBe(true);
    // Playing, but the player can only be turned on.
    expect(
      control("playing", "power", {
        supported_features: MediaPlayerEntityFeature.TURN_ON,
      }).disabled
    ).toBe(true);
  });
});

describe("media player play/pause toggle", () => {
  it("shows the play icon when not playing", () => {
    expect(control("idle", "media_play_pause").icon).toBe(mdiPlay);
    expect(control("paused", "media_play_pause").icon).toBe(mdiPlay);
  });

  it("shows the pause icon while playing", () => {
    expect(control("playing", "media_play_pause").icon).toBe(mdiPause);
  });

  it("shows the stop icon while playing when pause is unsupported", () => {
    expect(
      control("playing", "media_play_pause", {
        supported_features: MediaPlayerEntityFeature.PLAY,
      }).icon
    ).toBe(mdiStop);
  });

  it("is available (as pause) when only pause is supported", () => {
    const buttons = controlsFor("playing", ["media_play_pause"], {
      supported_features: MediaPlayerEntityFeature.PAUSE,
    });
    expect(buttons.map((b) => b.action)).toEqual(["media_pause"]);
  });
});

describe("media player control availability by state", () => {
  it("enables previous/next only while playing or paused", () => {
    expect(isEnabled("idle", "media_previous_track")).toBe(false);
    expect(isEnabled("playing", "media_previous_track")).toBe(true);
    expect(isEnabled("paused", "media_next_track")).toBe(true);
  });

  it("enables play only when not playing", () => {
    expect(isEnabled("idle", "media_play")).toBe(true);
    expect(isEnabled("playing", "media_play")).toBe(false);
  });

  it("enables pause and stop only while there is playback", () => {
    expect(isEnabled("idle", "media_pause")).toBe(false);
    expect(isEnabled("playing", "media_pause")).toBe(true);
    expect(isEnabled("idle", "media_stop")).toBe(false);
    expect(isEnabled("playing", "media_stop")).toBe(true);
  });

  it("enables power on when off and power off when active", () => {
    expect(isEnabled("off", "turn_on")).toBe(true);
    expect(isEnabled("playing", "turn_on")).toBe(false);
    expect(isEnabled("off", "turn_off")).toBe(false);
    expect(isEnabled("playing", "turn_off")).toBe(true);
  });

  it("greys out volume controls when off", () => {
    expect(isEnabled("off", "volume_up")).toBe(false);
    expect(isEnabled("playing", "volume_up")).toBe(true);
  });

  it("keeps play, pause and stop usable for assumed-state players", () => {
    const assumed = { assumed_state: true };
    expect(isEnabled("off", "media_play", assumed)).toBe(true);
    expect(isEnabled("off", "media_pause", assumed)).toBe(true);
    expect(isEnabled("off", "media_stop", assumed)).toBe(true);
  });
});

describe("media player control icons reflect state", () => {
  it("shows the muted/unmuted volume icon", () => {
    expect(
      control("playing", "volume_mute", { is_volume_muted: true }).icon
    ).toBe(mdiVolumeOff);
    expect(
      control("playing", "volume_mute", { is_volume_muted: false }).icon
    ).toBe(mdiVolumeHigh);
  });

  it("shows the shuffle on/off icon", () => {
    expect(control("playing", "shuffle", { shuffle: true }).icon).toBe(
      mdiShuffle
    );
    expect(control("playing", "shuffle", { shuffle: false }).icon).toBe(
      mdiShuffleDisabled
    );
  });

  it("shows the current repeat mode icon", () => {
    expect(control("playing", "repeat", { repeat: "one" }).icon).toBe(
      mdiRepeatOnce
    );
  });
});

describe("media player unsupported controls", () => {
  it("drops controls the player does not support", () => {
    const supported = features(
      MediaPlayerEntityFeature.PREVIOUS_TRACK,
      MediaPlayerEntityFeature.PLAY
    );
    const actions = controlsFor(
      "playing",
      ["media_previous_track", "media_play_pause", "media_next_track"],
      { supported_features: supported }
    ).map((b) => b.action);
    expect(actions).toContain("media_previous_track");
    expect(actions).not.toContain("media_next_track");
  });
});
