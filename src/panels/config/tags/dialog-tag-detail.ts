import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../common/dom/fire_event";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-formfield";
import "../../../components/ha-switch";
import "../../../components/map/ha-location-editor";
import { Tag, UpdateTagParams } from "../../../data/tag";
import { HassDialog } from "../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { TagDetailDialogParams } from "./show-dialog-tag-detail";

@customElement("dialog-tag-detail")
class DialogTagDetail extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _id?: string;

  @internalProperty() private _name!: string;

  @internalProperty() private _error?: string;

  @internalProperty() private _params?: TagDetailDialogParams;

  @internalProperty() private _submitting = false;

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

  public closeDialog(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
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
            : this.hass!.localize("ui.panel.config.tags.detail.new_tag")
        )}
      >
        <div>
          ${this._error ? html` <div class="error">${this._error}</div> ` : ""}
          <div class="form">
            ${this._params.entry
              ? html`${this.hass!.localize(
                  "ui.panel.config.tags.detail.tag_id"
                )}:
                ${this._params.entry.id}`
              : ""}
            <paper-input
              dialogInitialFocus
              .value=${this._name}
              .configValue=${"name"}
              @value-changed=${this._valueChanged}
              .label="${this.hass!.localize(
                "ui.panel.config.tags.detail.name"
              )}"
              .errorMessage="${this.hass!.localize(
                "ui.panel.config.tags.detail.required_error_msg"
              )}"
              required
              auto-validate
            ></paper-input>
            ${!this._params.entry
              ? html` <paper-input
                  .value=${this._id}
                  .configValue=${"id"}
                  @value-changed=${this._valueChanged}
                  .label=${this.hass!.localize(
                    "ui.panel.config.tags.detail.tag_id"
                  )}
                  .placeholder=${this.hass!.localize(
                    "ui.panel.config.tags.detail.tag_id_placeholder"
                  )}
                ></paper-input>`
              : ""}
          </div>
        </div>
        ${this._params.entry
          ? html`
              <mwc-button
                slot="secondaryAction"
                class="warning"
                @click="${this._deleteEntry}"
                .disabled=${this._submitting}
              >
                ${this.hass!.localize("ui.panel.config.tags.detail.delete")}
              </mwc-button>
            `
          : html``}
        <mwc-button
          slot="primaryAction"
          @click="${this._updateEntry}"
          .disabled=${this._submitting}
        >
          ${this._params.entry
            ? this.hass!.localize("ui.panel.config.tags.detail.update")
            : this.hass!.localize("ui.panel.config.tags.detail.create")}
        </mwc-button>
        ${this._params.openWrite && !this._params.entry
          ? html` <mwc-button
              slot="primaryAction"
              @click="${this._updateWriteEntry}"
              .disabled=${this._submitting}
            >
              ${this.hass!.localize(
                "ui.panel.config.tags.detail.create_and_write"
              )}
            </mwc-button>`
          : ""}
      </ha-dialog>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    const configValue = (ev.target as any).configValue;

    this._error = undefined;
    this[`_${configValue}`] = ev.detail.value;
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
    } catch (err) {
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

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        a {
          color: var(--primary-color);
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
