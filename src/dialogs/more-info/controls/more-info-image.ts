import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../common/decorators/consume";
import { transform } from "../../../common/decorators/transform";
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
    /> `;
  }

  static styles = css`
    :host {
      display: block;
      text-align: center;
    }
    img {
      max-width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-image": MoreInfoImage;
  }
}
