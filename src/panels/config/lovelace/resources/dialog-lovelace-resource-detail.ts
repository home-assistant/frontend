import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { HomeAssistant } from "../../../../types";
import {
  LovelaceResource,
  LovelaceResourcesMutableParams,
} from "../../../../data/lovelace";
import { LovelaceResourceDetailsDialogParams } from "./show-dialog-lovelace-resource-detail";
import { PolymerChangedEvent } from "../../../../polymer-types";
import { createCloseHeading } from "../../../../components/ha-dialog";
import { haStyleDialog } from "../../../../resources/styles";

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
    return html`
      <ha-dialog
        open
        @closing=${this._close}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this._params.resource
            ? this._params.resource.url
            : this.hass!.localize(
                "ui.panel.config.lovelace.resources.detail.new_resource"
              )
        )}
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
              dialogInitialFocus
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
                ${this._type === "js"
                  ? html`
                      <paper-item type="js">
                        ${this.hass!.localize(
                          "ui.panel.config.lovelace.resources.types.js"
                        )}
                      </paper-item>
                    `
                  : ""}
                <paper-item type="css">
                  ${this.hass!.localize(
                    "ui.panel.config.lovelace.resources.types.css"
                  )}
                </paper-item>
                ${this._type === "html"
                  ? html`
                      <paper-item type="html">
                        ${this.hass!.localize(
                          "ui.panel.config.lovelace.resources.types.html"
                        )}
                      </paper-item>
                    `
                  : ""}
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
      this._error = err?.message || "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  private async _deleteResource() {
    this._submitting = true;
    try {
      if (await this._params!.removeResource()) {
        this._close();
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
      haStyleDialog,
      css`
        .warning {
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
