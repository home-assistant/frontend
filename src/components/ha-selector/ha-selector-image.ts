import { mdiUpload, mdiUploadOff } from "@mdi/js";
import { css, CSSResultGroup, html, nothing, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { ImageSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../ha-icon-button";
import "../ha-textarea";
import "../ha-textfield";
import "../ha-picture-upload";
import type { HaPictureUpload } from "../ha-picture-upload";

@customElement("ha-selector-image")
export class HaImageSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public value?: any;

  @property() public name?: string;

  @property() public label?: string;

  @property() public placeholder?: string;

  @property() public helper?: string;

  @property() public selector!: ImageSelector;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @state() private showUpload = false;

  protected render() {
    return html`
      <div class="row">
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
        <ha-icon-button
          @click=${this._handleUploadToggle}
          .path=${this.showUpload ? mdiUploadOff : mdiUpload}
          .label=${this.hass.localize(
            this.showUpload
              ? "ui.components.selectors.image.upload_off"
              : "ui.components.selectors.image.upload_on"
          )}
        >
        </ha-icon-button>
      </div>
      ${this.showUpload
        ? html`
            <ha-picture-upload
              .hass=${this.hass}
              .value=${this.value?.startsWith("/api/") ? this.value : null}
              @change=${this._pictureChanged}
            ></ha-picture-upload>
          `
        : nothing}
    `;
  }

  private _handleUploadToggle() {
    this.showUpload = !this.showUpload;
  }

  private _pictureChanged(ev) {
    const value = (ev.target as HaPictureUpload).value;
    if (value) {
      fireEvent(this, "value-changed", { value });
    }
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

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        position: relative;
      }
      div {
        display: flex;
        align-items: center;
      }
      ha-textarea,
      ha-textfield {
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-image": HaImageSelector;
  }
}
