import "@material/mwc-icon-button/mwc-icon-button";
import { mdiFolderUpload } from "@mdi/js";
import "@polymer/iron-input/iron-input";
import "@polymer/paper-input/paper-input-container";
import {
  css,
  customElement,
  html,
  internalProperty,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { fireEvent } from "../../../src/common/dom/fire_event";
import "../../../src/components/ha-circular-progress";
import "../../../src/components/ha-svg-icon";
import { extractApiErrorMessage } from "../../../src/data/hassio/common";
import { uploadSnapshot } from "../../../src/data/hassio/snapshot";
import { HomeAssistant } from "../../../src/types";

declare global {
  interface HASSDomEvents {
    "snapshot-uploaded": undefined;
  }
}

@customElement("hassio-upload-snapshot")
export class HassioUploadSnapshot extends LitElement {
  public hass!: HomeAssistant;

  @internalProperty() public value: string | null = null;

  @internalProperty() private _error = "";

  @internalProperty() private _uploading = false;

  @internalProperty() private _drag = false;

  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has("_drag") && !this._uploading) {
      (this.shadowRoot!.querySelector(
        "paper-input-container"
      ) as any)._setFocused(this._drag);
    }
  }

  public render(): TemplateResult {
    return html`
      ${this._uploading
        ? html`<ha-circular-progress
            alt="Uploading"
            size="large"
            active
          ></ha-circular-progress>`
        : html`
            ${this._error ? html`<div class="error">${this._error}</div>` : ""}
            <label for="input">
              <paper-input-container
                .alwaysFloatLabel=${Boolean(this.value)}
                @drop=${this._handleDrop}
                @dragenter=${this._handleDragStart}
                @dragover=${this._handleDragStart}
                @dragleave=${this._handleDragEnd}
                @dragend=${this._handleDragEnd}
                class=${classMap({
                  dragged: this._drag,
                })}
              >
                <label for="input" slot="label">
                  Upload snapshot
                </label>
                <iron-input slot="input">
                  <input
                    id="input"
                    type="file"
                    class="file"
                    accept="application/x-tar"
                    @change=${this._handleFilePicked}
                  />
                </iron-input>
                <mwc-icon-button slot="suffix">
                  <ha-svg-icon .path=${mdiFolderUpload}></ha-svg-icon>
                </mwc-icon-button>
              </paper-input-container>
            </label>
          `}
    `;
  }

  private _handleDrop(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    if (ev.dataTransfer?.files) {
      this._uploadFile(ev.dataTransfer.files[0]);
    }
    this._drag = false;
  }

  private _handleDragStart(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    this._drag = true;
  }

  private _handleDragEnd(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    this._drag = false;
  }

  private async _handleFilePicked(ev) {
    this._uploadFile(ev.target.files[0]);
  }

  private async _uploadFile(file: File) {
    if (!["application/x-tar"].includes(file.type)) {
      this._error = "Unsupported format, please choose a tar file.";
      return;
    }
    this._uploading = true;
    this._error = "";
    try {
      await uploadSnapshot(this.hass, file);
    } catch (err) {
      this._error = extractApiErrorMessage(err);
    } finally {
      this._uploading = false;
      fireEvent(this, "snapshot-uploaded");
    }
  }

  static get styles() {
    return css`
      .error {
        color: var(--error-color);
      }
      paper-input-container {
        position: relative;
        padding: 8px;
        margin: 0 -8px;
      }
      paper-input-container.dragged:before {
        position: var(--layout-fit_-_position);
        top: var(--layout-fit_-_top);
        right: var(--layout-fit_-_right);
        bottom: var(--layout-fit_-_bottom);
        left: var(--layout-fit_-_left);
        background: currentColor;
        content: "";
        opacity: var(--dark-divider-opacity);
        pointer-events: none;
        border-radius: 4px;
      }
      input.file {
        display: none;
      }
      mwc-icon-button {
        --mdc-icon-button-size: 24px;
        --mdc-icon-size: 20px;
      }
      ha-circular-progress {
        display: block;
        text-align-last: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-upload-snapshot": HassioUploadSnapshot;
  }
}
