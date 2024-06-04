import { mdiTrashCan } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  nothing,
  LitElement,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import "../../../components/ha-icon-button";
import "../../../layouts/hass-subpage";
import "../../../components/ha-alert";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import {
  Image,
  deleteImage,
  fetchImages,
  generateImageThumbnailUrl,
} from "../../../data/image_upload";

@customElement("ha-config-images")
export class HaConfigImages extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean }) public isWide = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _images?: Image[];

  protected firstUpdated(changedProps): void {
    super.firstUpdated(changedProps);
    this._getImages();
  }

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.images.caption")}
        back-path="/config/system"
      >
        <div class="images">
          ${!this._images
            ? nothing
            : !this._images.length
              ? html`<ha-alert alert-type="info"
                  >${this.hass.localize(
                    "ui.panel.config.images.no_images"
                  )}</ha-alert
                >`
              : this._images.map((image) => this._renderImage(image))}
        </div>
      </hass-subpage>
    `;
  }

  private _renderImage(image: Image) {
    const url = generateImageThumbnailUrl(image.id, 256);
    const urlFull = generateImageThumbnailUrl(image.id, 0, true);
    return html`<a href=${urlFull} target="_blank">
        <ha-card outlined>
          <div
           style=${styleMap({
             backgroundImage: `url(${url})`,
           })}
          class="picture"
        >
        </div>
        <div class="card-header">
          ${image.name}
          <ha-icon-button
            .image=${image}
            .path=${mdiTrashCan}
            @click=${this._deleteImage}
          ></ha-icon-button>
        </div>
        <div class="card-content">
          ID: ${image.id}<br>
          ${image.uploaded_at}
        </div>
      </div>
    </ha-card>
    </a>`;
  }

  private async _getImages() {
    this._images = await fetchImages(this.hass);
  }

  private async _deleteImage(ev) {
    ev.preventDefault();
    const imageToDelete = ev.currentTarget.image;

    showConfirmationDialog(this, {
      title: this.hass.localize("ui.panel.config.images.delete_confirm_title"),
      text: this.hass.localize("ui.panel.config.images.delete_confirm_text", {
        name: imageToDelete.name,
      }),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirmText: this.hass.localize("ui.common.delete"),
      destructive: true,
      confirm: () => {
        deleteImage(this.hass, imageToDelete.id);
        this._images = this._images!.filter((image) => image !== imageToDelete);
      },
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .container {
          padding: 8px 16px 16px;
          margin: 0 auto 64px auto;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: var(--secondary-text-color);
          padding-inline-start: 8px;
        }
        .header h2 {
          font-size: 14px;
          font-weight: 500;
          margin-top: 28px;
        }
        .header ha-icon {
          margin-inline-end: 8px;
        }
        .images {
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          display: grid;
          grid-gap: 16px 16px;
          max-width: 2000px;
          margin-bottom: 16px;
        }
        .images > * {
          max-width: 500px;
        }
        ha-card {
          overflow: hidden;
        }
        a {
          text-decoration: none;
        }
        h1 {
          padding-bottom: 0;
        }

        .picture {
          height: 300px;
          width: 100%;
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          position: relative;
        }
        .card-content {
          min-height: 16px;
          color: var(--secondary-text-color);
        }
        .card-header {
          font-size: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          overflow-wrap: anywhere;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-images": HaConfigImages;
  }
}
