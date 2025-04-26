import "@material/mwc-button";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-qr-code";
import "../../../components/ha-switch";
import "../../../components/ha-textfield";
import type { Tag, UpdateTagParams } from "../../../data/tag";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { TagDetailDialogParams } from "./show-dialog-tag-detail";

const TAG_BASE = "https://www.home-assistant.io/tag/";

@customElement("dialog-tag-detail")
class DialogTagDetail
  extends LitElement
  implements HassDialog<TagDetailDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _id?: string;

  @state() private _name!: string;

  @state() private _error?: string;

  @state() private _params?: TagDetailDialogParams;

  @state() private _submitting = false;

  public showDialog(params: TagDetailDialogParams): void {
    this._params = params;
    this._error = undefined;
    if (this._params.entry) {
      this._name = this._params.entry.name || "";
    } else {
      this._id = "";
      this._name = "";
    }
  }

  public closeDialog() {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
    return true;
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this._params.entry
            ? this._params.entry.name || this._params.entry.id
            : this.hass!.localize("ui.panel.config.tag.detail.new_tag")
        )}
      >
        <div>
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}
          <div class="form">
            ${this._params.entry
              ? html`${this.hass!.localize(
                  "ui.panel.config.tag.detail.tag_id"
                )}:
                ${this._params.entry.id}`
              : ""}
            <ha-textfield
              dialogInitialFocus
              .value=${this._name}
              .configValue=${"name"}
              @input=${this._valueChanged}
              .label=${this.hass!.localize("ui.panel.config.tag.detail.name")}
              .validationMessage=${this.hass!.localize(
                "ui.panel.config.tag.detail.required_error_msg"
              )}
              required
            ></ha-textfield>
            ${!this._params.entry
              ? html`<ha-textfield
                  .value=${this._id || ""}
                  .configValue=${"id"}
                  @input=${this._valueChanged}
                  .label=${this.hass!.localize(
                    "ui.panel.config.tag.detail.tag_id"
                  )}
                  .placeholder=${this.hass!.localize(
                    "ui.panel.config.tag.detail.tag_id_placeholder"
                  )}
                ></ha-textfield>`
              : ""}
          </div>
          ${this._params.entry
            ? html`
                <div>
                  <p>
                    ${this.hass!.localize("ui.panel.config.tag.detail.usage", {
                      companion_link: html`<a
                        href="https://companion.home-assistant.io/"
                        target="_blank"
                        rel="noreferrer"
                        >${this.hass!.localize(
                          "ui.panel.config.tag.detail.companion_apps"
                        )}</a
                      >`,
                    })}
                  </p>
                </div>
                <div id="qr">
                  <ha-qr-code
                    .data=${`${TAG_BASE}${this._params!.entry!.id}`}
                    center-image="/static/icons/favicon-192x192.png"
                    error-correction-level="quartile"
                    scale="5"
                  >
                  </ha-qr-code>
                </div>
              `
            : ``}
        </div>
        ${this._params.entry
          ? html`
              <mwc-button
                slot="secondaryAction"
                class="warning"
                @click=${this._deleteEntry}
                .disabled=${this._submitting}
              >
                ${this.hass!.localize("ui.panel.config.tag.detail.delete")}
              </mwc-button>
            `
          : nothing}
        <mwc-button
          slot="primaryAction"
          @click=${this._updateEntry}
          .disabled=${this._submitting || !this._name}
        >
          ${this._params.entry
            ? this.hass!.localize("ui.panel.config.tag.detail.update")
            : this.hass!.localize("ui.panel.config.tag.detail.create")}
        </mwc-button>
        ${this._params.openWrite && !this._params.entry
          ? html`<mwc-button
              slot="primaryAction"
              @click=${this._updateWriteEntry}
              .disabled=${this._submitting || !this._name}
            >
              ${this.hass!.localize(
                "ui.panel.config.tag.detail.create_and_write"
              )}
            </mwc-button>`
          : ""}
      </ha-dialog>
    `;
  }

  private _valueChanged(ev: Event) {
    const target = ev.target as any;
    const configValue = target.configValue;

    this._error = undefined;
    this[`_${configValue}`] = target.value;
  }

  private async _updateEntry() {
    this._submitting = true;
    let newValue: Tag | undefined;
    try {
      const values: UpdateTagParams = {
        name: this._name.trim(),
      };
      if (this._params!.entry) {
        newValue = await this._params!.updateEntry!(values);
      } else {
        newValue = await this._params!.createEntry(values, this._id);
      }
      this.closeDialog();
    } catch (err: any) {
      this._error = err ? err.message : "Unknown error";
    } finally {
      this._submitting = false;
    }
    return newValue;
  }

  private async _updateWriteEntry() {
    const openWrite = this._params?.openWrite;
    const tag = await this._updateEntry();
    if (!tag || !openWrite) {
      return;
    }
    openWrite(tag);
  }

  private async _deleteEntry() {
    this._submitting = true;
    try {
      if (await this._params!.removeEntry!()) {
        this._params = undefined;
      }
    } finally {
      this._submitting = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        a {
          color: var(--primary-color);
        }
        #qr {
          text-align: center;
        }
        ha-textfield {
          display: block;
          margin: 8px 0;
        }
        ::slotted(img) {
          height: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-tag-detail": DialogTagDetail;
  }
}
