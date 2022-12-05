import { styles } from "@material/mwc-textfield/mwc-textfield.css";
import { mdiClose } from "@mdi/js";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../common/dom/fire_event";
import { HomeAssistant } from "../types";
import "./ha-circular-progress";
import "./ha-icon-button";

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

  @property() public label!: string;

  @property() public value: string | TemplateResult | null = null;

  @property({ type: Boolean }) private uploading = false;

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
        ? html`<ha-circular-progress
            alt="Uploading"
            size="large"
            active
          ></ha-circular-progress>`
        : html`
            <label
              for="input"
              class="mdc-text-field mdc-text-field--filled ${classMap({
                "mdc-text-field--focused": this._drag,
                "mdc-text-field--with-leading-icon": Boolean(this.icon),
                "mdc-text-field--with-trailing-icon": Boolean(this.value),
              })}"
              @drop=${this._handleDrop}
              @dragenter=${this._handleDragStart}
              @dragover=${this._handleDragStart}
              @dragleave=${this._handleDragEnd}
              @dragend=${this._handleDragEnd}
            >
              <span class="mdc-text-field__ripple"></span>
              <span
                class="mdc-floating-label ${this.value || this._drag
                  ? "mdc-floating-label--float-above"
                  : ""}"
                id="label"
                >${this.label}</span
              >
              ${this.icon
                ? html`<span
                    class="mdc-text-field__icon mdc-text-field__icon--leading"
                    tabindex="-1"
                  >
                    <ha-icon-button
                      @click=${this._openFilePicker}
                      .path=${this.icon}
                    ></ha-icon-button>
                  </span>`
                : ""}
              <div class="value">${this.value}</div>
              <input
                id="input"
                type="file"
                class="mdc-text-field__input file"
                accept=${this.accept}
                @change=${this._handleFilePicked}
                aria-labelledby="label"
              />
              ${this.value
                ? html`<span
                    class="mdc-text-field__icon mdc-text-field__icon--trailing"
                    tabindex="1"
                  >
                    <ha-icon-button
                      slot="suffix"
                      @click=${this._clearValue}
                      .label=${this.hass?.localize("ui.common.close") ||
                      "close"}
                      .path=${mdiClose}
                    ></ha-icon-button>
                  </span>`
                : ""}
              <span
                class="mdc-line-ripple ${this._drag
                  ? "mdc-line-ripple--active"
                  : ""}"
              ></span>
            </label>
          `}
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
    fireEvent(this, "change");
  }

  static get styles() {
    return [
      styles,
      css`
        :host {
          display: block;
        }
        .mdc-text-field--filled {
          height: auto;
          padding-top: 16px;
          cursor: pointer;
        }
        .mdc-text-field--filled.mdc-text-field--with-trailing-icon {
          padding-top: 28px;
        }
        .mdc-text-field:not(.mdc-text-field--disabled) .mdc-text-field__icon {
          color: var(--secondary-text-color);
        }
        .mdc-text-field--filled.mdc-text-field--with-trailing-icon
          .mdc-text-field__icon {
          align-self: flex-end;
        }
        .mdc-text-field__icon--leading {
          margin-bottom: 12px;
          inset-inline-start: initial;
          inset-inline-end: 0px;
          direction: var(--direction);
        }
        .mdc-text-field--filled .mdc-floating-label--float-above {
          transform: scale(0.75);
          top: 8px;
        }
        .mdc-floating-label {
          inset-inline-start: 16px !important;
          inset-inline-end: initial !important;
          direction: var(--direction);
        }
        .mdc-text-field--filled .mdc-floating-label {
          inset-inline-start: 48px !important;
          inset-inline-end: initial !important;
          direction: var(--direction);
        }
        .dragged:before {
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
        .value {
          width: 100%;
        }
        input.file {
          display: none;
        }
        img {
          max-width: 100%;
          max-height: 125px;
        }
        ha-icon-button {
          --mdc-icon-button-size: 24px;
          --mdc-icon-size: 20px;
        }
        ha-circular-progress {
          display: block;
          text-align-last: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-file-upload": HaFileUpload;
  }
}
