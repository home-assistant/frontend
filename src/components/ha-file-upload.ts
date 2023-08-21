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

declare global {
  interface HASSDomEvents {
    "file-picked": { files: FileList };
  }
}

@customElement("ha-file-upload")
export class HaFileUpload extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public accept!: string;

  @property() public icon?: string;

  @property() public label?: string;

  @property() public secondary?: string;

  @property() public value: string | TemplateResult | null = null;

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
      <label
        for=${this.value ? "" : "input"}
        class=${classMap({
          dragged: this._drag,
          value: Boolean(this.value),
        })}
        @drop=${this._handleDrop}
        @dragenter=${this._handleDragStart}
        @dragover=${this._handleDragStart}
        @dragleave=${this._handleDragEnd}
        @dragend=${this._handleDragEnd}
      >
        ${this.uploading
          ? html`<div class="row">
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
              ></mwc-linear-progress>`
          : html`${!this.value
                ? html`<ha-svg-icon
                      class="big-icon"
                      slot="icon"
                      .path=${this.icon || mdiFileUpload}
                    ></ha-svg-icon>
                    <span class="header"
                      >${this.label ||
                      this.hass?.localize("ui.components.file-upload.label", {
                        browse: html`<span class="highlight"
                          >${this.hass?.localize(
                            "ui.components.file-upload.browse"
                          )}</span
                        >`,
                      })}</span
                    >
                    <span class="secondary" id="label">${this.secondary}</span>`
                : html`<div class="row">
                    <div class="value" @click=${this._openFilePicker}>
                      <ha-svg-icon
                        slot="icon"
                        .path=${this.icon || mdiFileUpload}
                      ></ha-svg-icon
                      >${this.value}
                    </div>
                    <ha-icon-button
                      slot="suffix"
                      @click=${this._clearValue}
                      .label=${this.hass?.localize("ui.common.delete") ||
                      "Delete"}
                      .path=${mdiDelete}
                    ></ha-icon-button>
                  </div>`}
              <input
                id="input"
                type="file"
                class="file"
                accept=${this.accept}
                @change=${this._handleFilePicked}
                aria-labelledby="label"
              />`}
      </label>
    `;
  }

  private _openFilePicker() {
    this._input?.click();
  }

  private _handleDrop(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    if (ev.dataTransfer?.files) {
      fireEvent(this, "file-picked", { files: ev.dataTransfer.files });
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
    fireEvent(this, "file-picked", { files: ev.target.files });
  }

  private _clearValue(ev: Event) {
    ev.preventDefault();
    this.value = null;
    this._input!.value = "";
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
      label {
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        border: dashed 1px
          var(--mdc-text-field-idle-line-color, rgba(0, 0, 0, 0.42));
        border-radius: var(--mdc-shape-small, 4px);
        height: 100%;
        cursor: pointer;
      }
      :host([disabled]) label {
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
      .secondary {
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
      img {
        max-width: 100%;
        max-height: 200px;
        border-radius: var(--file-upload-image-border-radius);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-file-upload": HaFileUpload;
  }
}
