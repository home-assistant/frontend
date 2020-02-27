import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../../../components/ha-dialog";
import { HomeAssistant } from "../../../../types";
import {
  LovelaceResource,
  LovelaceResourcesMutableParams,
} from "../../../../data/lovelace";
import { LovelaceResourceDetailsDialogParams } from "./show-dialog-lovelace-resource-detail";
import { PolymerChangedEvent } from "../../../../polymer-types";

@customElement("dialog-lovelace-resource-detail")
export class DialogLovelaceResourceDetail extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() private _params?: LovelaceResourceDetailsDialogParams;
  @property() private _url!: LovelaceResource["url"];
  @property() private _type!: LovelaceResource["type"];
  @property() private _error?: string;
  @property() private _submitting = false;

  public async showDialog(
    params: LovelaceResourceDetailsDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = undefined;
    if (this._params.resource) {
      this._url = this._params.resource.url || "";
      this._type = this._params.resource.type || "module";
    } else {
      this._url = "";
      this._type = "module";
    }
    await this.updateComplete;
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    const urlInvalid = this._url.trim() === "";
    // tslint:disable-next-line: prettier
    const title = html`
      ${this._params.resource
        ? this._params.resource.url
        : this.hass!.localize(
            "ui.panel.config.lovelace.resources.detail.new_resource"
          )}
      <paper-icon-button
        aria-label=${this.hass.localize(
          "ui.panel.config.lovelace.resources.detail.dismiss"
        )}
        icon="hass:close"
        dialogAction="close"
        style="position: absolute; right: 16px; top: 12px;"
      ></paper-icon-button>
    `;
    return html`
      <ha-dialog
        open
        @closing="${this._close}"
        scrimClickAction=""
        escapeKeyAction=""
        .heading=${title}
      >
        <div>
          ${this._error
            ? html`
                <div class="error">${this._error}</div>
              `
            : ""}
          <div class="form">
            <h3 class="warning">
              ${this.hass!.localize(
                "ui.panel.config.lovelace.resources.detail.warning_header"
              )}
            </h3>
            ${this.hass!.localize(
              "ui.panel.config.lovelace.resources.detail.warning_text"
            )}
            <paper-input
              .value=${this._url}
              @value-changed=${this._urlChanged}
              .label=${this.hass!.localize(
                "ui.panel.config.lovelace.resources.detail.url"
              )}
              .errorMessage=${this.hass!.localize(
                "ui.panel.config.lovelace.resources.detail.url_error_msg"
              )}
              .invalid=${urlInvalid}
            ></paper-input>
            <br />
            <ha-paper-dropdown-menu
              .label=${this.hass!.localize(
                "ui.panel.config.lovelace.resources.detail.type"
              )}
            >
              <paper-listbox
                slot="dropdown-content"
                .selected=${this._type}
                @iron-select=${this._typeChanged}
                attr-for-selected="type"
              >
                <paper-item type="module">
                  ${this.hass!.localize(
                    "ui.panel.config.lovelace.resources.types.module"
                  )}
                </paper-item>
                <paper-item type="js">
                  ${this.hass!.localize(
                    "ui.panel.config.lovelace.resources.types.js"
                  )}
                </paper-item>
                <paper-item type="css">
                  ${this.hass!.localize(
                    "ui.panel.config.lovelace.resources.types.css"
                  )}
                </paper-item>
                <paper-item type="html">
                  ${this.hass!.localize(
                    "ui.panel.config.lovelace.resources.types.html"
                  )}
                </paper-item>
              </paper-listbox>
            </ha-paper-dropdown-menu>
          </div>
        </div>
        ${this._params.resource
          ? html`
              <mwc-button
                slot="secondaryAction"
                class="warning"
                @click="${this._deleteResource}"
                .disabled=${this._submitting}
              >
                ${this.hass!.localize(
                  "ui.panel.config.lovelace.resources.detail.delete"
                )}
              </mwc-button>
            `
          : html``}
        <mwc-button
          slot="primaryAction"
          @click="${this._updateResource}"
          .disabled=${urlInvalid || this._submitting}
        >
          ${this._params.resource
            ? this.hass!.localize(
                "ui.panel.config.lovelace.resources.detail.update"
              )
            : this.hass!.localize(
                "ui.panel.config.lovelace.resources.detail.create"
              )}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _urlChanged(ev: PolymerChangedEvent<string>) {
    this._error = undefined;
    this._url = ev.detail.value;
  }

  private _typeChanged(ev: CustomEvent) {
    this._type = ev.detail.item.getAttribute("type");
  }

  private async _updateResource() {
    this._submitting = true;
    try {
      const values: LovelaceResourcesMutableParams = {
        url: this._url.trim(),
        res_type: this._type,
      };
      if (this._params!.resource) {
        await this._params!.updateResource(values);
      } else {
        await this._params!.createResource(values);
      }
      this._params = undefined;
    } catch (err) {
      this._error = err ? err.message : "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  private async _deleteResource() {
    this._submitting = true;
    try {
      if (await this._params!.removeResource()) {
        this._params = undefined;
      }
    } finally {
      this._submitting = false;
    }
  }

  private _close(): void {
    this._params = undefined;
  }

  static get styles(): CSSResult[] {
    return [
      css`
        ha-dialog {
          --mdc-dialog-min-width: 400px;
          --mdc-dialog-max-width: 600px;
          --mdc-dialog-title-ink-color: var(--primary-text-color);
          --justify-action-buttons: space-between;
        }
        /* make dialog fullscreen on small screens */
        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-dialog {
            --mdc-dialog-min-width: 100vw;
            --mdc-dialog-max-height: 100vh;
            --mdc-dialog-shape-radius: 0px;
            --vertial-align-dialog: flex-end;
          }
        }
        .form {
          padding-bottom: 24px;
        }
        mwc-button.warning {
          --mdc-theme-primary: var(--error-color);
        }
        .warning {
          color: var(--error-color);
        }
        .error {
          color: var(--error-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-lovelace-resource-detail": DialogLovelaceResourceDetail;
  }
}
