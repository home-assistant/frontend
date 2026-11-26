import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../common/decorators/consume";
import { transform } from "../../../common/decorators/transform";
import type { HASSDomCurrentTargetEvent } from "../../../common/dom/fire_event";
import { fireEvent } from "../../../common/dom/fire_event";
import { connectionContext, formattersContext } from "../../../data/context";
import type { ImageEntity } from "../../../data/image";
import { computeImageUrl } from "../../../data/image";
import type {
  HomeAssistantConnection,
  HomeAssistantFormatters,
} from "../../../types";

@customElement("more-info-image")
class MoreInfoImage extends LitElement {
  @state()
  @consume({ context: connectionContext, subscribe: true })
  private _connection?: HomeAssistantConnection;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  @transform<
    HomeAssistantFormatters,
    HomeAssistantFormatters["formatEntityName"]
  >({
    transformer: ({ formatEntityName }) => formatEntityName,
  })
  private _formatEntityName?: HomeAssistantFormatters["formatEntityName"];

  @property({ attribute: false }) public stateObj?: ImageEntity;

  private _size?: HASSDomEvents["media-size-changed"];

  public connectedCallback() {
    super.connectedCallback();
    // A cached view that was detached while the picture loaded couldn't send
    // its size, and the picture doesn't load again when it's shown
    if (this._size) {
      fireEvent(this, "media-size-changed", this._size);
    }
  }

  protected render() {
    if (!this._connection || !this.stateObj) {
      return nothing;
    }
    const imageUrl = computeImageUrl(this.stateObj);
    if (!imageUrl) {
      return nothing;
    }
    return html`<img
      alt=${this._formatEntityName?.(this.stateObj) || this.stateObj.entity_id}
      src=${this._connection.hassUrl(imageUrl)}
      @load=${this._imageLoaded}
    /> `;
  }

  private _imageLoaded(ev: HASSDomCurrentTargetEvent<HTMLImageElement>) {
    const { naturalWidth, naturalHeight } = ev.currentTarget;
    if (!naturalWidth || !naturalHeight) {
      return;
    }
    this._size = { aspectRatio: naturalWidth / naturalHeight, naturalWidth };
    fireEvent(this, "media-size-changed", this._size);
  }

  static styles = css`
    :host {
      display: block;
    }
    img {
      display: block;
      margin: 0 auto;
      max-width: 100%;
      max-height: var(--more-info-media-max-height, none);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-image": MoreInfoImage;
  }
}
