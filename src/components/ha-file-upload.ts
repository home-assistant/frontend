import "@material/mwc-linear-progress/mwc-linear-progress";
import { mdiDelete, mdiFileUpload } from "@mdi/js";
import { LitElement, PropertyValues, TemplateResult, css, html } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../common/dom/fire_event";
import { HomeAssistant } from "../types";
import "./ha-button";
import "./ha-icon-button";
import { blankBeforePercent } from "../common/translations/blank_before_percent";
import { ensureArray } from "../common/array/ensure-array";
import { bytesToString } from "../util/bytes-to-string";

declare global {
  interface HASSDomEvents {
    "file-picked": { files: File[] };
  }
}

@customElement("ha-file-upload")
export class HaFileUpload extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public accept!: string;

  @property() public icon?: string;

  @property() public label?: string;

  @property() public secondary?: string;

  @property() public supports?: string;

  @property() public value?: File | File[] | FileList | string;

  @property({ type: Boolean }) private multiple = false;

  @property({ type: Boolean, reflect: true }) public disabled: boolean = false;

  @property({ type: Boolean }) private uploading = false;

  @property({ type: Number }) private progress?: number;

  @property({ type: Boolean, attribute: "auto-open-file-dialog" })
  private autoOpenFileDialog = false;

  @state() private _drag = false;

  @query("#input") private _input?: HTMLInputElement;

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    if (this.autoOpenFileDialog) {
      this._openFilePicker();
    }
  }

  public render(): TemplateResult {
    return html`
      ${this.uploading
        ? html`<div class="container">
            <div class="row">
              <span class="header"
                >${this.value
                  ? this.hass?.localize(
                      "ui.components.file-upload.uploading_name",
                      { name: this.value }
                    )
                  : this.hass?.localize(
                      "ui.components.file-upload.uploading"
                    )}</span
              >
              ${this.progress
                ? html`<span class="progress"
                    >${this.progress}${blankBeforePercent(
                      this.hass!.locale
                    )}%</span
                  >`
                : ""}
            </div>
            <mwc-linear-progress
              .indeterminate=${!this.progress}
              .progress=${this.progress ? this.progress / 100 : undefined}
            ></mwc-linear-progress>
          </div>`
        : html`<label
            for=${this.value ? "" : "input"}
            class="container ${classMap({
              dragged: this._drag,
              multiple: this.multiple,
              value: Boolean(this.value),
            })}"
            @drop=${this._handleDrop}
            @dragenter=${this._handleDragStart}
            @dragover=${this._handleDragStart}
            @dragleave=${this._handleDragEnd}
            @dragend=${this._handleDragEnd}
            >${!this.value
              ? html`<ha-svg-icon
                    class="big-icon"
                    .path=${this.icon || mdiFileUpload}
                  ></ha-svg-icon>
                  <ha-button unelevated @click=${this._openFilePicker}>
                    ${this.label ||
                    this.hass?.localize("ui.components.file-upload.label")}
                  </ha-button>
                  <span class="secondary"
                    >${this.secondary ||
                    this.hass?.localize(
                      "ui.components.file-upload.secondary"
                    )}</span
                  >
                  <span class="supports">${this.supports}</span>`
              : typeof this.value === "string"
              ? html`<div class="row">
                  <div class="value" @click=${this._openFilePicker}>
                    <ha-svg-icon
                      .path=${this.icon || mdiFileUpload}
                    ></ha-svg-icon>
                    ${this.value}
                  </div>
                  <ha-icon-button
                    @click=${this._clearValue}
                    .label=${this.hass?.localize("ui.common.delete") ||
                    "Delete"}
                    .path=${mdiDelete}
                  ></ha-icon-button>
                </div>`
              : (this.value instanceof FileList
                  ? Array.from(this.value)
                  : ensureArray(this.value)
                ).map(
                  (file) =>
                    html`<div class="row">
                      <div class="value" @click=${this._openFilePicker}>
                        <ha-svg-icon
                          .path=${this.icon || mdiFileUpload}
                        ></ha-svg-icon>
                        ${file.name} - ${bytesToString(file.size)}
                      </div>
                      <ha-icon-button
                        @click=${this._clearValue}
                        .label=${this.hass?.localize("ui.common.delete") ||
                        "Delete"}
                        .path=${mdiDelete}
                      ></ha-icon-button>
                    </div>`
                )}
            <input
              id="input"
              type="file"
              class="file"
              .accept=${this.accept}
              .multiple=${this.multiple}
              @change=${this._handleFilePicked}
          /></label>`}
    `;
  }

  private _openFilePicker() {
    this._input?.click();
  }

  private _handleDrop(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    if (ev.dataTransfer?.files) {
      fireEvent(this, "file-picked", {
        files:
          this.multiple || ev.dataTransfer.files.length === 1
            ? Array.from(ev.dataTransfer.files)
            : [ev.dataTransfer.files[0]],
      });
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

  private _handleFilePicked(ev) {
    if (ev.target.files.length === 0) {
      return;
    }
    this.value = ev.target.files;
    fireEvent(this, "file-picked", { files: ev.target.files });
  }

  private _clearValue(ev: Event) {
    ev.preventDefault();
    this._input!.value = "";
    this.value = undefined;
    fireEvent(this, "change");
  }

  static get styles() {
    return css`
      :host {
        display: block;
        height: 240px;
      }
      :host([disabled]) {
        pointer-events: none;
        color: var(--disabled-text-color);
      }
      .container {
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        border: solid 1px
          var(--mdc-text-field-idle-line-color, rgba(0, 0, 0, 0.42));
        border-radius: var(--mdc-shape-small, 4px);
        height: 100%;
      }
      label.container {
        border: dashed 1px
          var(--mdc-text-field-idle-line-color, rgba(0, 0, 0, 0.42));
        cursor: pointer;
      }
      :host([disabled]) .container {
        border-color: var(--disabled-color);
      }
      label.dragged {
        border-color: var(--primary-color);
      }
      .dragged:before {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        background-color: var(--primary-color);
        content: "";
        opacity: var(--dark-divider-opacity);
        pointer-events: none;
        border-radius: var(--mdc-shape-small, 4px);
      }
      label.value {
        cursor: default;
      }
      label.value.multiple {
        justify-content: unset;
        overflow: auto;
      }
      .highlight {
        color: var(--primary-color);
      }
      .row {
        display: flex;
        width: 100%;
        align-items: center;
        justify-content: space-between;
        padding: 0 16px;
        box-sizing: border-box;
      }
      ha-button {
        margin-bottom: 4px;
      }
      .supports {
        color: var(--secondary-text-color);
        font-size: 12px;
      }
      :host([disabled]) .secondary {
        color: var(--disabled-text-color);
      }
      input.file {
        display: none;
      }
      .value {
        cursor: pointer;
      }
      .value ha-svg-icon {
        margin-right: 8px;
      }
      .big-icon {
        --mdc-icon-size: 48px;
        margin-bottom: 8px;
      }
      ha-button {
        --mdc-button-outline-color: var(--primary-color);
        --mdc-icon-button-size: 24px;
      }
      mwc-linear-progress {
        width: 100%;
        padding: 16px;
        box-sizing: border-box;
      }
      .header {
        font-weight: 500;
      }
      .progress {
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-file-upload": HaFileUpload;
  }
}
