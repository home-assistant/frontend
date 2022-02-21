import {
  BROWSER_PLAYER,
  MediaPlayerEntity,
  MediaPlayerItem,
  SUPPORT_PAUSE,
  SUPPORT_PLAY,
} from "../../data/media-player";
import { ResolvedMediaSource } from "../../data/media_source";
import { HomeAssistant } from "../../types";

export class BrowserMediaPlayer {
  private player: HTMLAudioElement;

  // We pretend we're playing while still buffering.
  private _buffering = true;

  private _removed = false;

  constructor(
    public hass: HomeAssistant,
    public item: MediaPlayerItem,
    public resolved: ResolvedMediaSource,
    private onChange: () => void
  ) {
    const player = new Audio(this.resolved.url);
    player.addEventListener("play", this._handleChange);
    player.addEventListener("playing", () => {
      this._buffering = false;
      this._handleChange();
    });
    player.addEventListener("pause", this._handleChange);
    player.addEventListener("ended", this._handleChange);
    player.addEventListener("canplaythrough", () => {
      if (this._removed) {
        return;
      }
      player.play();
      this.onChange();
    });
    this.player = player;
  }

  private _handleChange = () => {
    if (!this._removed) {
      this.onChange();
    }
  };

  public pause() {
    if (this.player) {
      this.player.pause();
    }
  }

  public play() {
    if (this.player) {
      this.player.play();
    }
  }

  public remove() {
    this._removed = true;
    // @ts-ignore
    this.onChange = undefined;
    if (this.player) {
      this.player.pause();
    }
  }

  public get isPlaying(): boolean {
    return this._buffering || (!this.player.paused && !this.player.ended);
  }

  static idleStateObj(): MediaPlayerEntity {
    const now = new Date().toISOString();
    return {
      state: "idle",
      entity_id: BROWSER_PLAYER,
      last_changed: now,
      last_updated: now,
      attributes: {},
      context: { id: "", user_id: null },
    };
  }

  toStateObj(): MediaPlayerEntity {
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement
    const base = BrowserMediaPlayer.idleStateObj();
    base.state = this.isPlaying ? "playing" : "paused";
    base.attributes = {
      media_title: this.item.title,
      entity_picture: this.item.thumbnail,
      // eslint-disable-next-line no-bitwise
      supported_features: SUPPORT_PLAY | SUPPORT_PAUSE,
    };

    if (this.player.duration) {
      base.attributes.media_duration = this.player.duration;
      base.attributes.media_position = this.player.currentTime;
      base.attributes.media_position_updated_at = base.last_updated;
    }
    return base;
  }
}
