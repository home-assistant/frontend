import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-color-picker";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-icon-picker";
import "../../../components/ha-switch";
import "../../../components/ha-textarea";
import "../../../components/ha-textfield";
import type { LabelRegistryEntryMutableParams } from "../../../data/label_registry";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { LabelDetailDialogParams } from "./show-dialog-label-detail";

@customElement("dialog-label-detail")
class DialogLabelDetail
  extends LitElement
  implements HassDialog<LabelDetailDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _name!: string;

  @state() private _icon!: string;

  @state() private _color!: string;

  @state() private _description!: string;

  @state() private _error?: string;

  @state() private _params?: LabelDetailDialogParams;

  @state() private _submitting = false;

  public showDialog(params: LabelDetailDialogParams): void {
    this._params = params;
    this._error = undefined;
    if (this._params.entry) {
      this._name = this._params.entry.name || "";
      this._icon = this._params.entry.icon || "";
      this._color = this._params.entry.color || "";
      this._description = this._params.entry.description || "";
    } else {
      this._name = this._params.suggestedName || "";
      this._icon = "";
      this._color = "";
      this._description = "";
    }
    document.body.addEventListener("keydown", this._handleKeyPress);
  }

  private _handleKeyPress = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      ev.stopPropagation();
    }
  };

  public closeDialog() {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
    document.body.removeEventListener("keydown", this._handleKeyPress);
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
            ? this._params.entry.name || this._params.entry.label_id
            : this.hass!.localize("ui.panel.config.labels.detail.new_label")
        )}
      >
        <div>
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}
          <div class="form">
            <ha-textfield
              dialogInitialFocus
              .value=${this._name}
              .configValue=${"name"}
              @input=${this._input}
              .label=${this.hass!.localize(
                "ui.panel.config.labels.detail.name"
              )}
              .validationMessage=${this.hass!.localize(
                "ui.panel.config.labels.detail.required_error_msg"
              )}
              required
            ></ha-textfield>
            <ha-icon-picker
              .value=${this._icon}
              .hass=${this.hass}
              .configValue=${"icon"}
              @value-changed=${this._valueChanged}
              .label=${this.hass!.localize(
                "ui.panel.config.labels.detail.icon"
              )}
            ></ha-icon-picker>
            <ha-color-picker
              .value=${this._color}
              .configValue=${"color"}
              .hass=${this.hass}
              @value-changed=${this._valueChanged}
              .label=${this.hass!.localize(
                "ui.panel.config.labels.detail.color"
              )}
            ></ha-color-picker>
            <ha-textarea
              .value=${this._description}
              .configValue=${"description"}
              @input=${this._input}
              .label=${this.hass!.localize(
                "ui.panel.config.labels.detail.description"
              )}
            ></ha-textarea>
          </div>
        </div>
        ${this._params.entry && this._params.removeEntry
          ? html`
              <ha-button
                slot="secondaryAction"
                variant="danger"
                appearance="plain"
                @click=${this._deleteEntry}
                .disabled=${this._submitting}
              >
                ${this.hass!.localize("ui.panel.config.labels.detail.delete")}
              </ha-button>
            `
          : nothing}
        <ha-button
          slot="primaryAction"
          @click=${this._updateEntry}
          .disabled=${this._submitting || !this._name}
        >
          ${this._params.entry
            ? this.hass!.localize("ui.panel.config.labels.detail.update")
            : this.hass!.localize("ui.panel.config.labels.detail.create")}
        </ha-button>
      </ha-dialog>
    `;
  }

  private _input(ev: Event) {
    const target = ev.target as any;
    const configValue = target.configValue;

    this._error = undefined;
    this[`_${configValue}`] = target.value;
  }

  private _valueChanged(ev: CustomEvent) {
    const target = ev.target as any;
    const configValue = target.configValue;

    this._error = undefined;
    this[`_${configValue}`] = ev.detail.value || "";
  }

  private async _updateEntry() {
    this._submitting = true;
    try {
      const values: LabelRegistryEntryMutableParams = {
        name: this._name.trim(),
        icon: this._icon.trim() || null,
        color: this._color.trim() || null,
        description: this._description.trim() || null,
      };
      if (this._params!.entry) {
        await this._params!.updateEntry!(values);
      } else {
        await this._params!.createEntry!(values);
      }
      this.closeDialog();
    } catch (err: any) {
      this._error = err ? err.message : "Unknown error";
    } finally {
      this._submitting = false;
    }
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
        ha-textarea,
        ha-textfield,
        ha-icon-picker,
        ha-color-picker {
          display: block;
        }
        ha-color-picker,
        ha-textarea {
          margin-top: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-label-detail": DialogLabelDetail;
  }
}
