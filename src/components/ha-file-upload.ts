import "@material/mwc-linear-progress/mwc-linear-progress";
import { mdiDelete, mdiFileUpload } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../common/dom/fire_event";
import type { HomeAssistant } from "../types";
import "./ha-button";
import "./ha-icon-button";
import { blankBeforePercent } from "../common/translations/blank_before_percent";
import { ensureArray } from "../common/array/ensure-array";
import { bytesToString } from "../util/bytes-to-string";
import type { LocalizeFunc } from "../common/translations/localize";

declare global {
  interface HASSDomEvents {
    "file-picked": { files: File[] };
    "files-cleared": undefined;
  }
}

@customElement("ha-file-upload")
export class HaFileUpload extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public localize?: LocalizeFunc;

  @property() public accept!: string;

  @property() public icon?: string;

  @property() public label?: string;

  @property() public secondary?: string;

  @property({ attribute: "uploading-label" }) public uploadingLabel?: string;

  @property({ attribute: "delete-label" }) public deleteLabel?: string;

  @property() public supports?: string;

  @property({ type: Object }) public value?: File | File[] | FileList | string;

  @property({ type: Boolean }) public multiple = false;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public uploading = false;

  @property({ type: Number }) public progress?: number;

  @property({ type: Boolean, attribute: "auto-open-file-dialog" })
  public autoOpenFileDialog = false;

  @state() private _drag = false;

  @query("#input") private _input?: HTMLInputElement;

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    if (this.autoOpenFileDialog) {
      this._openFilePicker();
    }
  }

  private get _name() {
    if (this.value === undefined) {
      return "";
    }
    if (typeof this.value === "string") {
      return this.value;
    }
    const files =
      this.value instanceof FileList
        ? Array.from(this.value)
        : ensureArray(this.value);

    return files.map((file) => file.name).join(", ");
  }

  public render(): TemplateResult {
    const localize = this.localize || this.hass!.localize;
    return html`
      ${this.uploading
        ? html`<div class="container">
            <div class="uploading">
              <span class="header"
                >${this.uploadingLabel ||
                (this.value
                  ? localize("ui.components.file-upload.uploading_name", {
                      name: this._name,
                    })
                  : localize("ui.components.file-upload.uploading"))}</span
              >
              ${this.progress
                ? html`<div class="progress">
                    ${this.progress}${this.hass &&
                    blankBeforePercent(this.hass!.locale)}%
                  </div>`
                : nothing}
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
              ? html`<ha-button
                    size="small"
                    appearance="filled"
                    @click=${this._openFilePicker}
                  >
                    <ha-svg-icon
                      slot="start"
                      .path=${this.icon || mdiFileUpload}
                    ></ha-svg-icon>
                    ${this.label || localize("ui.components.file-upload.label")}
                  </ha-button>
                  <span class="secondary"
                    >${this.secondary ||
                    localize("ui.components.file-upload.secondary")}</span
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
                      .label=${this.deleteLabel || localize("ui.common.delete")}
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
                          .label=${this.deleteLabel ||
                          localize("ui.common.delete")}
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
    fireEvent(this, "files-cleared");
  }

  static styles = css`
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
    .row {
      display: flex;
      align-items: center;
    }
    label.container {
      border: dashed 1px
        var(--mdc-text-field-idle-line-color, rgba(0, 0, 0, 0.42));
      cursor: pointer;
    }
    .container .uploading {
      display: flex;
      flex-direction: column;
      width: 100%;
      align-items: flex-start;
      padding: 0 32px;
      box-sizing: border-box;
    }
    :host([disabled]) .container {
      border-color: var(--disabled-color);
    }
    label:hover,
    label.dragged {
      border-style: solid;
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
    ha-button {
      margin-bottom: 8px;
    }
    .supports {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
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
      margin-inline-end: 8px;
      margin-inline-start: initial;
    }
    ha-button {
      --mdc-button-outline-color: var(--primary-color);
      --mdc-icon-button-size: 24px;
    }
    mwc-linear-progress {
      width: 100%;
      padding: 8px 32px;
      box-sizing: border-box;
    }
    .header {
      font-weight: var(--ha-font-weight-medium);
    }
    .progress {
      color: var(--secondary-text-color);
    }
    button.link {
      background: none;
      border: none;
      padding: 0;
      font-size: var(--ha-font-size-m);
      color: var(--primary-color);
      text-decoration: underline;
      cursor: pointer;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-file-upload": HaFileUpload;
  }
}
