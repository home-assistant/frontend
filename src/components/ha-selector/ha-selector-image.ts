import { css, html, LitElement } from "lit";
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
import type { HaPictureUpload } from "../ha-picture-upload";
import { URL_PREFIX } from "../../data/image_upload";

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

  @state() private showUpload = false;

  protected firstUpdated(changedProps): void {
    super.firstUpdated(changedProps);

    if (!this.value || this.value.startsWith(URL_PREFIX)) {
      this.showUpload = true;
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
          <ha-formfield
            .label=${this.hass.localize("ui.components.selectors.image.upload")}
          >
            <ha-radio
              name="mode"
              value="upload"
              .checked=${this.showUpload}
              @change=${this._radioGroupPicked}
            ></ha-radio>
          </ha-formfield>
          <ha-formfield
            .label=${this.hass.localize("ui.components.selectors.image.url")}
          >
            <ha-radio
              name="mode"
              value="url"
              .checked=${!this.showUpload}
              @change=${this._radioGroupPicked}
            ></ha-radio>
          </ha-formfield>
        </label>
        ${!this.showUpload
          ? html`
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
              ></ha-textfield>
            `
          : html`
              <ha-picture-upload
                .hass=${this.hass}
                .value=${this.value?.startsWith(URL_PREFIX) ? this.value : null}
                .original=${this.selector.image?.original}
                .cropOptions=${this.selector.image?.crop}
                select-media
                @change=${this._pictureChanged}
              ></ha-picture-upload>
            `}
      </div>
    `;
  }

  private _radioGroupPicked(ev): void {
    this.showUpload = ev.target.value === "upload";
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
