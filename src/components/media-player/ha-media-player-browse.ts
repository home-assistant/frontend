import {
  LitElement,
  html,
  customElement,
  property,
  PropertyValues,
  internalProperty,
  css,
} from "lit-element";
import { HomeAssistant } from "../../types";
import {
  MediaPlayerItemParent,
  browseMediaPlayer,
} from "../../data/media-player";
import "../ha-circular-progress";
import { haStyle } from "../../resources/styles";
import { mdiPlay } from "@mdi/js";

@customElement("ha-media-player-browse")
class HaMediaPlayerBrowse extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public entityId!: string;

  @property() public mediaContentId?: string;

  @property() public mediaContentType?: string;

  @internalProperty() private _loading = false;

  @internalProperty() private _item?: MediaPlayerItemParent;

  public render() {
    if (!this._item) {
      return html``;
    }
    if (this._loading) {
      return html`<ha-circular-progress active></ha-circular-progress>`;
    }
    return html`
      <h1>${this._item.title}</h1>
      <ul>
        ${this._item.children.map(
          (child) => html`
            <li .child=${child}>
              ${child.can_expand
                ? html`
                    <button class="link" @click=${this._navigate}>
                      ${child.title}
                    </button>
                  `
                : child.title}
              ${!child.can_play
                ? ""
                : html`
                    <ha-svg-icon
                      title="Play Media"
                      path=${mdiPlay}
                      @click=${this._playMedia}
                    ></ha-svg-icon>
                  `}
            </li>
          `
        )}
      </ul>
    `;
  }

  public updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (
      !changedProps.has("entityId") &&
      !changedProps.has("mediaContentId") &&
      !changedProps.has("mediaContentType")
    ) {
      return;
    }

    this._fetchData(this.mediaContentId, this.mediaContentType);
  }

  private async _fetchData(mediaContentId?: string, mediaContentType?: string) {
    this._item = await browseMediaPlayer(
      this.hass,
      this.entityId,
      mediaContentId,
      mediaContentType
    );
  }

  private _navigate(ev) {
    const item = ev.target.parentElement.child;
    this._fetchData(item.media_content_id, item.media_content_type);
  }

  private _playMedia(ev) {
    const item = ev.target.parentElement.child;
    // todo play media
  }

  static get styles() {
    return [haStyle, css``];
  }
}
