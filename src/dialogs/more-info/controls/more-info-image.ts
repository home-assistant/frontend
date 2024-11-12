import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-camera-stream";
import type { ImageEntity } from "../../../data/image";
import { computeImageUrl } from "../../../data/image";
import type { HomeAssistant } from "../../../types";
import { fileDownload } from "../../../util/file_download";
import { UNAVAILABLE } from "../../../data/entity";
import "../../../components/buttons/ha-progress-button";
import { showToast } from "../../../util/toast";

@customElement("more-info-image")
class MoreInfoImage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: ImageEntity;

  @state() private _waiting = false;

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
    }
    return html`<img
        alt=${this.stateObj.attributes.friendly_name || this.stateObj.entity_id}
        src=${this.hass.hassUrl(computeImageUrl(this.stateObj))}
      />

      <div class="actions">
        <ha-progress-button
          @click=${this._download}
          .progress=${this._waiting}
          .disabled=${this.stateObj.state === UNAVAILABLE}
        >
          ${this.hass.localize("ui.dialogs.more_info_control.image.download")}
        </ha-progress-button>
      </div>`;
  }

  private async _download(ev: CustomEvent) {
    const button = ev.currentTarget as any;
    this._waiting = true;

    try {
      const result: Response | undefined = await this.hass.callApiRaw(
        "GET",
        `image_proxy/${this.stateObj!.entity_id}`
      );

      if (!result) {
        throw new Error("No response from API");
      }

      const blob = await result.blob();
      const url = window.URL.createObjectURL(blob);
      fileDownload(url);
    } catch (err) {
      this._waiting = false;
      button.actionError();
      showToast(this, {
        message: this.hass.localize(
          "ui.dialogs.more_info_control.image.failed_to_download"
        ),
      });
      return;
    }

    this._waiting = false;
    button.actionSuccess();
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        text-align: center;
      }
      img {
        max-width: 100%;
      }

      .actions {
        width: 100%;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: flex-end;
        box-sizing: border-box;
        padding: 12px 12px 0px 0px;
        z-index: 1;
        gap: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-image": MoreInfoImage;
  }
}
