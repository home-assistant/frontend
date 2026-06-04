import {
  mdiPause,
  mdiPlay,
  mdiPowerOff,
  mdiPowerOn,
  mdiPowerStandby,
  mdiRepeat,
  mdiRepeatOff,
  mdiRepeatOnce,
  mdiShuffle,
  mdiShuffleDisabled,
  mdiSkipNext,
  mdiSkipPrevious,
  mdiStop,
  mdiVolumeHigh,
  mdiVolumeMinus,
  mdiVolumeOff,
  mdiVolumePlus,
} from "@mdi/js";
import { stateActive } from "../../../common/entity/state_active";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type {
  ControlButton,
  MediaPlayerEntity,
} from "../../../data/media-player";
import { MediaPlayerEntityFeature } from "../../../data/media-player";
import type { MediaPlayerPlaybackControl } from "./types";

const MEDIA_PLAYER_PLAYBACK_CONTROLS_FEATURES: Record<
  MediaPlayerPlaybackControl,
  MediaPlayerEntityFeature[]
> = {
  turn_on: [MediaPlayerEntityFeature.TURN_ON],
  turn_off: [MediaPlayerEntityFeature.TURN_OFF],
  power: [MediaPlayerEntityFeature.TURN_ON, MediaPlayerEntityFeature.TURN_OFF],
  media_play: [MediaPlayerEntityFeature.PLAY],
  media_pause: [MediaPlayerEntityFeature.PAUSE],
  media_play_pause: [
    MediaPlayerEntityFeature.PLAY,
    MediaPlayerEntityFeature.PAUSE,
  ],
  media_stop: [MediaPlayerEntityFeature.STOP],
  media_previous_track: [MediaPlayerEntityFeature.PREVIOUS_TRACK],
  media_next_track: [MediaPlayerEntityFeature.NEXT_TRACK],
  volume_down: [MediaPlayerEntityFeature.VOLUME_STEP],
  volume_up: [MediaPlayerEntityFeature.VOLUME_STEP],
  volume_mute: [MediaPlayerEntityFeature.VOLUME_MUTE],
  shuffle: [MediaPlayerEntityFeature.SHUFFLE_SET],
  repeat: [MediaPlayerEntityFeature.REPEAT_SET],
};

export const supportsMediaPlayerPlaybackControl = (
  stateObj: MediaPlayerEntity,
  control: MediaPlayerPlaybackControl
): boolean =>
  MEDIA_PLAYER_PLAYBACK_CONTROLS_FEATURES[control].some((feature) =>
    supportsFeature(stateObj, feature)
  );

// Default playback row. Non-assumed players use the power and play/pause
// toggles (one button each, resolved by state). Assumed-state players can't
// reliably tell on from off or play from pause, so they get separate controls
// (each its own service).
export const MEDIA_PLAYER_DEFAULT_CONTROLS: MediaPlayerPlaybackControl[] = [
  "power",
  "media_previous_track",
  "media_play_pause",
  "media_next_track",
];

const MEDIA_PLAYER_ASSUMED_DEFAULT_CONTROLS: MediaPlayerPlaybackControl[] = [
  "turn_on",
  "turn_off",
  "media_previous_track",
  "media_play",
  "media_pause",
  "media_next_track",
];

export const getDefaultMediaPlayerControls = (
  stateObj?: MediaPlayerEntity
): MediaPlayerPlaybackControl[] =>
  stateObj && isAssumed(stateObj)
    ? MEDIA_PLAYER_ASSUMED_DEFAULT_CONTROLS
    : MEDIA_PLAYER_DEFAULT_CONTROLS;

const isPlaying = (stateObj: MediaPlayerEntity): boolean =>
  stateObj.state === "playing";

const isAssumed = (stateObj: MediaPlayerEntity): boolean =>
  stateObj.attributes.assumed_state === true;

// Track controls only make sense while there is something to play.
const hasMediaContext = (stateObj: MediaPlayerEntity): boolean =>
  stateObj.state === "playing" ||
  stateObj.state === "paused" ||
  isAssumed(stateObj);

// Each builder always returns its button and flags `disabled` when the control
// does not apply to the current state. Buttons render disabled by default; the
// `hide_disabled_controls` option hides them instead.
export const MEDIA_PLAYER_PLAYBACK_CONTROLS_BUTTONS: Record<
  MediaPlayerPlaybackControl,
  (stateObj: MediaPlayerEntity) => ControlButton
> = {
  turn_on: (stateObj) => ({
    icon: mdiPowerOn,
    action: "turn_on",
    // Usable while reachable and not already on.
    disabled:
      stateObj.state === UNAVAILABLE ||
      (stateActive(stateObj) && !isAssumed(stateObj)),
  }),
  turn_off: (stateObj) => ({
    icon: mdiPowerOff,
    action: "turn_off",
    disabled: !stateActive(stateObj) && !isAssumed(stateObj),
  }),
  // Resolve to the concrete action in the builder, like media_play_pause, so
  // the called service follows the current state and the click handler needs no
  // special case for the toggle.
  power: (stateObj) => {
    const active = stateActive(stateObj);
    return {
      icon: mdiPowerStandby,
      action: active ? "turn_off" : "turn_on",
      disabled:
        stateObj.state === UNAVAILABLE ||
        !supportsFeature(
          stateObj,
          active
            ? MediaPlayerEntityFeature.TURN_OFF
            : MediaPlayerEntityFeature.TURN_ON
        ),
    };
  },
  media_play: (stateObj) => ({
    icon: mdiPlay,
    action: "media_play",
    disabled:
      !isAssumed(stateObj) && (!stateActive(stateObj) || isPlaying(stateObj)),
  }),
  media_pause: (stateObj) => ({
    icon: mdiPause,
    action: "media_pause",
    disabled: !isPlaying(stateObj) && !isAssumed(stateObj),
  }),
  // Resolve to the concrete action in the builder so the icon and the called
  // service come from one decision and can't drift, and the click handler needs
  // no special case for the toggle.
  media_play_pause: (stateObj) => {
    const playing = isPlaying(stateObj);
    const canPause = supportsFeature(stateObj, MediaPlayerEntityFeature.PAUSE);
    return {
      icon: !playing ? mdiPlay : canPause ? mdiPause : mdiStop,
      action: !playing ? "media_play" : canPause ? "media_pause" : "media_stop",
      disabled: !stateActive(stateObj),
    };
  },
  media_stop: (stateObj) => ({
    icon: mdiStop,
    action: "media_stop",
    disabled: !hasMediaContext(stateObj),
  }),
  media_previous_track: (stateObj) => ({
    icon: mdiSkipPrevious,
    action: "media_previous_track",
    disabled: !hasMediaContext(stateObj),
  }),
  media_next_track: (stateObj) => ({
    icon: mdiSkipNext,
    action: "media_next_track",
    disabled: !hasMediaContext(stateObj),
  }),
  volume_down: (stateObj) => ({
    icon: mdiVolumeMinus,
    action: "volume_down",
    disabled: !stateActive(stateObj),
  }),
  volume_up: (stateObj) => ({
    icon: mdiVolumePlus,
    action: "volume_up",
    disabled: !stateActive(stateObj),
  }),
  volume_mute: (stateObj) => ({
    icon: stateObj.attributes.is_volume_muted ? mdiVolumeOff : mdiVolumeHigh,
    action: "volume_mute",
    disabled: !stateActive(stateObj),
  }),
  shuffle: (stateObj) => ({
    icon:
      stateObj.attributes.shuffle === true ? mdiShuffle : mdiShuffleDisabled,
    action: "shuffle",
    disabled: !hasMediaContext(stateObj),
  }),
  repeat: (stateObj) => ({
    icon:
      stateObj.attributes.repeat === "all"
        ? mdiRepeat
        : stateObj.attributes.repeat === "one"
          ? mdiRepeatOnce
          : mdiRepeatOff,
    action: "repeat",
    disabled: !hasMediaContext(stateObj),
  }),
};

// Buttons for the given controls and state. Each is flagged `disabled` when not
// usable; the caller decides whether to render them disabled or hide them.
export const computeMediaPlayerPlaybackButtons = (
  stateObj: MediaPlayerEntity,
  controls: readonly MediaPlayerPlaybackControl[]
): ControlButton[] =>
  controls
    .filter((control) => supportsMediaPlayerPlaybackControl(stateObj, control))
    .map((control) =>
      MEDIA_PLAYER_PLAYBACK_CONTROLS_BUTTONS[control](stateObj)
    );
