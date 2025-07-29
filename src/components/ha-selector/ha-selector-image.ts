import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { ImageSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-icon-button";
import "../ha-textarea";
import "../ha-textfield";
import "../ha-picture-upload";
import "../ha-radio";
import "../ha-formfield";
import "./ha-selector-media";
import type { HaPictureUpload } from "../ha-picture-upload";
import { URL_PREFIX } from "../../data/image_upload";
import { isMediaSourceContentId } from "../../data/media_source";

const MODE_UPLOAD = "upload" as const;
const MODE_MEDIA = "media" as const;
const MODE_URL = "url" as const;

const MODES = [MODE_UPLOAD, MODE_MEDIA, MODE_URL] as const;

type Mode = (typeof MODES)[number];

const SELECTOR = {
  media: {
    accept: ["image/*"],
  },
};

@customElement("ha-selector-image")
export class HaImageSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public value?: any;

  @property() public name?: string;

  @property() public label?: string;

  @property() public placeholder?: string;

  @property() public helper?: string;

  @property({ attribute: false }) public selector!: ImageSelector;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @state() private _mode: Mode = MODE_URL;

  @state() private _supportedModes: Mode[] = [...MODES];

  protected firstUpdated(changedProps): void {
    super.firstUpdated(changedProps);

    const supportsMedia = this.selector.image?.supports_media;

    if (!supportsMedia) {
      this._supportedModes = [MODE_UPLOAD, MODE_URL];
    }

    if (!this.value || this.value.startsWith(URL_PREFIX)) {
      this._mode = MODE_UPLOAD;
    } else if (supportsMedia && isMediaSourceContentId(this.value)) {
      this._mode = MODE_MEDIA;
    }
  }

  protected render() {
    return html`
      <div>
        <label>
          ${this.hass.localize(
            "ui.components.selectors.image.select_image_with_label",
            {
              label:
                this.label ||
                this.hass.localize("ui.components.selectors.image.image"),
            }
          )}
          ${this._supportedModes.map(
            (mode) => html`
              <ha-formfield
                .label=${this.hass.localize(
                  mode === MODE_MEDIA
                    ? "ui.components.selectors.media.pick_media"
                    : `ui.components.selectors.image.${mode}`
                )}
              >
                <ha-radio
                  name="mode"
                  value=${mode}
                  .checked=${this._mode === mode}
                  @change=${this._radioGroupPicked}
                ></ha-radio>
              </ha-formfield>
            `
          )}
        </label>
        ${this._mode === MODE_UPLOAD
          ? html`
              <ha-picture-upload
                .hass=${this.hass}
                .value=${this.value?.startsWith(URL_PREFIX) ? this.value : null}
                .original=${this.selector.image?.original}
                .cropOptions=${this.selector.image?.crop}
                select-media
                @change=${this._pictureChanged}
              ></ha-picture-upload>
            `
          : html`${this._mode === MODE_MEDIA
                ? html`
                    <ha-selector-media
                      .hass=${this.hass}
                      .selector=${SELECTOR}
                      .disabled=${this.disabled}
                      .required=${this.required}
                      .helper=${this.helper}
                      @value-changed=${this._mediaPicked}
                    ></ha-selector-media>
                  `
                : nothing}
              <ha-textfield
                .name=${this.name}
                .value=${this.value || ""}
                .placeholder=${this.placeholder || ""}
                .helper=${this.helper}
                helperPersistent
                .disabled=${this.disabled}
                @input=${this._handleChange}
                .label=${this.label || ""}
                .required=${this.required}
              ></ha-textfield>`}
      </div>
    `;
  }

  private _radioGroupPicked(ev): void {
    this._mode = ev.target.value;
  }

  private _pictureChanged(ev) {
    const value = (ev.target as HaPictureUpload).value;

    fireEvent(this, "value-changed", { value: value ?? undefined });
  }

  private _handleChange(ev) {
    let value = ev.target.value;
    if (this.value === value) {
      return;
    }
    if (value === "" && !this.required) {
      value = undefined;
    }

    fireEvent(this, "value-changed", { value });
  }

  private _mediaPicked(ev): void {
    ev.stopPropagation();
    const value = ev.detail.value?.media_content_id;
    fireEvent(this, "value-changed", { value });
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
    }
    div {
      display: flex;
      flex-direction: column;
    }
    label {
      display: flex;
      flex-direction: column;
    }
    ha-textarea,
    ha-textfield {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-image": HaImageSelector;
  }
}
