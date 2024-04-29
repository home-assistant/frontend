import { mdiFileUpload } from "@mdi/js";
import { CSSResultGroup, LitElement, TemplateResult, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-icon-button";
import "../ha-textfield";
import type { HaFormElement, HaFormFileSchema } from "./types";
import { HomeAssistant } from "../../types";

@customElement("ha-form-file")
export class HaFormFile extends LitElement implements HaFormElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public schema!: HaFormFileSchema;

  @property() public label!: string;

  @property() public supportedFormats?: string;

  @state() private _file?: File;

  @state() private _uploading = false;

  protected render(): TemplateResult {
    return html`
      <ha-file-upload
        .hass=${this.hass}
        .uploading=${this._uploading}
        .icon=${mdiFileUpload}
        .label=${this.label}
        .supports=${this.schema.supportedFormats}
        .value=${this._file}
        accept=${this.schema.accept || ""}
        @file-picked=${this._setFile}
        @change=${this._handleFileCleared}
      ></ha-file-upload>
    `;
  }

  private async _setFile(ev: CustomEvent) {
    this._file = ev.detail.file![0];
    fireEvent(this, "value-changed", {
      value: this._file,
    });
  }

  private _handleFileCleared() {
    this._file = undefined;
    fireEvent(this, "value-changed", {
      value: undefined,
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        position: relative;
      }
      :host([own-margin]) {
        margin-bottom: 5px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-file": HaFormFile;
  }
}
