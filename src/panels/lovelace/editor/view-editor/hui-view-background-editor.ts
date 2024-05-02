import "@material/mwc-list/mwc-list-item";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/user/ha-user-badge";
import { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import { HomeAssistant, ValueChangedEvent } from "../../../../types";
import "../../../../components/ha-picture-upload";
import type { HaPictureUpload } from "../../../../components/ha-picture-upload";
import { CropOptions } from "../../../../dialogs/image-cropper-dialog/show-image-cropper-dialog";

const cropOptions: CropOptions = {
  round: false,
  type: "image/jpeg",
  quality: 0.75,
  aspectRatio: 1.78,
};

@customElement("hui-view-background-editor")
export class HuiViewBackgroundEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config!: LovelaceViewConfig;

  set config(config: LovelaceViewConfig) {
    this._config = config;
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    const backgroundUrlRegex = /url\(['"]?([^'"]+)['"]?\)/;
    const backgroundUrlMatch = backgroundUrlRegex.exec(
      this._config?.background || ""
    );
    const backgroundUrl = backgroundUrlMatch ? backgroundUrlMatch[1] : null;

    return html`
      <p>
        ${this.hass.localize(
          "ui.panel.lovelace.editor.edit_view.background.title"
        )}
      </p>
      <ha-picture-upload
        .hass=${this.hass}
        .value=${backgroundUrl}
        crop
        .cropOptions=${cropOptions}
        original
        @change=${this._backgroundChanged}
      ></ha-picture-upload>
    `;
  }

  private _backgroundChanged(ev: ValueChangedEvent<string | null>) {
    const backgroundUrl = (ev.target as HaPictureUpload).value;
    const config = {
      ...this._config,
      background: backgroundUrl
        ? `center / cover no-repeat url('${backgroundUrl}')`
        : undefined,
    };
    fireEvent(this, "view-config-changed", { config });
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-background-editor": HuiViewBackgroundEditor;
  }
}
