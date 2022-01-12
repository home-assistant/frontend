import "@material/mwc-button/mwc-button";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { createCloseHeading } from "../../../../components/ha-dialog";
import "../../../../components/ha-paper-dropdown-menu";
import {
  LovelaceResource,
  LovelaceResourcesMutableParams,
} from "../../../../data/lovelace";
import { PolymerChangedEvent } from "../../../../polymer-types";
import { haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { LovelaceResourceDetailsDialogParams } from "./show-dialog-lovelace-resource-detail";

const detectResourceType = (url: string) => {
  const ext = url.split(".").pop() || "";

  if (ext === "css") {
    return "css";
  }

  if (ext === "js") {
    return "module";
  }

  return undefined;
};

@customElement("dialog-lovelace-resource-detail")
export class DialogLovelaceResourceDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: LovelaceResourceDetailsDialogParams;

  @state() private _url!: LovelaceResource["url"];

  @state() private _type?: LovelaceResource["type"];

  @state() private _error?: string;

  @state() private _submitting = false;

  public async showDialog(
    params: LovelaceResourceDetailsDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = undefined;
    if (this._params.resource) {
      this._url = this._params.resource.url || "";
      this._type = this._params.resource.type || undefined;
    } else {
      this._url = "";
      this._type = undefined;
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
        @closed=${this._close}
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
          ${this._error ? html` <div class="error">${this._error}</div> ` : ""}
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
                .invalid=${!this._type}
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
                @click=${this._deleteResource}
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
          @click=${this._updateResource}
          .disabled=${urlInvalid || !this._type || this._submitting}
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
    if (!this._type) {
      this._type = detectResourceType(this._url);
    }
  }

  private _typeChanged(ev: CustomEvent) {
    this._type = ev.detail.item.getAttribute("type");
  }

  private async _updateResource() {
    if (!this._type) {
      return;
    }

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
    } catch (err: any) {
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

  static get styles(): CSSResultGroup {
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
