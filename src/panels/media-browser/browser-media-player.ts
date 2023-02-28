import {
  BROWSER_PLAYER,
  MediaPlayerEntity,
  MediaPlayerEntityFeature,
  MediaPlayerItem,
} from "../../data/media-player";
import { ResolvedMediaSource } from "../../data/media_source";
import { HomeAssistant } from "../../types";

export const ERR_UNSUPPORTED_MEDIA = "Unsupported Media";

export class BrowserMediaPlayer {
  private player: HTMLAudioElement;

  // We pretend we're playing while still buffering.
  public buffering = true;

  private _removed = false;

  constructor(
    public hass: HomeAssistant,
    public item: MediaPlayerItem,
    public resolved: ResolvedMediaSource,
    volume: number,
    private onChange: () => void
  ) {
    const player = new Audio(this.resolved.url);
    if (player.canPlayType(resolved.mime_type) === "") {
      throw new Error(ERR_UNSUPPORTED_MEDIA);
    }
    player.autoplay = true;
    player.volume = volume;
    player.addEventListener("play", this._handleChange);
    player.addEventListener("playing", () => {
      this.buffering = false;
      this._handleChange();
    });
    player.addEventListener("pause", this._handleChange);
    player.addEventListener("ended", this._handleChange);
    player.addEventListener("canplaythrough", this._handleChange);
    this.player = player;
  }

  private _handleChange = () => {
    if (!this._removed) {
      this.onChange();
    }
  };

  public pause() {
    this.buffering = false;
    this.player.pause();
  }

  public play() {
    this.player.play();
  }

  public setVolume(volume: number) {
    this.player.volume = volume;
    this.onChange();
  }

  public remove() {
    this._removed = true;
    // @ts-ignore
    this.onChange = undefined;
    if (this.player) {
      this.player.pause();
    }
  }

  static idleStateObj(): MediaPlayerEntity {
    const now = new Date().toISOString();
    return {
      state: "idle",
      entity_id: BROWSER_PLAYER,
      last_changed: now,
      last_updated: now,
      attributes: {},
      context: { id: "", user_id: null, parent_id: null },
    };
  }

  toStateObj(): MediaPlayerEntity {
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement
    const stateObj = BrowserMediaPlayer.idleStateObj();
    stateObj.state = this.buffering
      ? "buffering"
      : this.player.paused || this.player.ended
      ? "paused"
      : "playing";
    stateObj.attributes = {
      media_title: this.item.title,
      entity_picture: this.item.thumbnail,
      volume_level: this.player.volume,
      supported_features:
        // eslint-disable-next-line no-bitwise
        MediaPlayerEntityFeature.PLAY |
        // eslint-disable-next-line no-bitwise
        MediaPlayerEntityFeature.PAUSE |
        MediaPlayerEntityFeature.VOLUME_SET,
    };

    if (this.player.duration) {
      stateObj.attributes.media_duration = this.player.duration;
      stateObj.attributes.media_position = this.player.currentTime;
      stateObj.attributes.media_position_updated_at = stateObj.last_updated;
    }
    return stateObj;
  }
}
