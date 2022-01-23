import {
  MediaPlayerEntity,
  MediaPlayerItem,
  SUPPORT_PAUSE,
  SUPPORT_PLAY,
} from "../../data/media-player";
import { resolveMediaSource } from "../../data/media_source";
import { HomeAssistant } from "../../types";

export class BrowserMediaPlayer {
  private player?: HTMLAudioElement;

  private stopped = false;

  constructor(
    public hass: HomeAssistant,
    private item: MediaPlayerItem,
    private onChange: () => void
  ) {}

  public async initialize() {
    const resolvedUrl: any = await resolveMediaSource(
      this.hass,
      this.item.media_content_id
    );

    const player = new Audio(resolvedUrl.url);
    player.addEventListener("play", this._handleChange);
    player.addEventListener("playing", this._handleChange);
    player.addEventListener("pause", this._handleChange);
    player.addEventListener("ended", this._handleChange);
    player.addEventListener("canplaythrough", () => {
      if (this.stopped) {
        return;
      }
      this.player = player;
      player.play();
      this.onChange();
    });
  }

  private _handleChange = () => {
    if (!this.stopped) {
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

  public stop() {
    this.stopped = true;
    // @ts-ignore
    this.onChange = undefined;
    if (this.player) {
      this.player.pause();
    }
  }

  public get isPlaying(): boolean {
    return (
      this.player !== undefined &&
      !this.player.paused &&
      !this.player.ended &&
      this.player.readyState > 2
    );
  }

  toStateObj(): MediaPlayerEntity {
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement
    const now = new Date().toISOString();
    const base: MediaPlayerEntity = {
      state: "idle",
      entity_id: "media_player.browser",
      last_changed: now,
      last_updated: now,
      attributes: {},
      context: { id: "", user_id: null },
    };
    if (!this.player) {
      return base;
    }
    base.state = this.isPlaying ? "playing" : "paused";
    base.attributes = {
      media_title: this.item.title,
      media_duration: this.player.duration,
      media_position: this.player.currentTime,
      media_position_updated_at: now,
      entity_picture: this.item.thumbnail,
      // eslint-disable-next-line no-bitwise
      supported_features: SUPPORT_PLAY | SUPPORT_PAUSE,
    };
    return base;
  }
}
