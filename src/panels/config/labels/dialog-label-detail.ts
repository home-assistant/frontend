import { consume, type ContextType } from "@lit/context";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-color-picker";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-icon-picker";
import "../../../components/ha-switch";
import "../../../components/ha-textarea";
import "../../../components/ha-textfield";
import { localizeContext } from "../../../data/context";
import type { LabelRegistryEntryMutableParams } from "../../../data/label/label_registry";
import { DialogMixin } from "../../../dialogs/dialog-mixin";
import { haStyleDialog } from "../../../resources/styles";
import type { LabelDetailDialogParams } from "./show-dialog-label-detail";

@customElement("dialog-label-detail")
class DialogLabelDetail extends DialogMixin<LabelDetailDialogParams>(
  LitElement
) {
  @state()
  @consume({ context: localizeContext, subscribe: true })
  private localize!: ContextType<typeof localizeContext>;

  @state() private _name!: string;

  @state() private _icon!: string;

  @state() private _color!: string;

  @state() private _description!: string;

  @state() private _error?: string;

  @state() private _submitting = false;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.params?.entry) {
      this._name = this.params.entry.name || "";
      this._icon = this.params.entry.icon || "";
      this._color = this.params.entry.color || "";
      this._description = this.params.entry.description || "";
    } else {
      this._name = this.params?.suggestedName || "";
      this._icon = "";
      this._color = "";
      this._description = "";
    }
  }

  protected render() {
    if (!this.params) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        header-title=${this.params.entry
          ? this.params.entry.name || this.params.entry.label_id
          : this.localize("ui.dialogs.label-detail.new_label")}
        prevent-scrim-close
      >
        <div>
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}
          <div class="form">
            <ha-textfield
              autofocus
              .value=${this._name}
              .configValue=${"name"}
              @input=${this._input}
              .label=${this.localize("ui.dialogs.label-detail.name")}
              .validationMessage=${this.localize(
                "ui.dialogs.label-detail.required_error_msg"
              )}
              required
            ></ha-textfield>
            <ha-icon-picker
              .value=${this._icon}
              .configValue=${"icon"}
              @value-changed=${this._valueChanged}
              .label=${this.localize("ui.dialogs.label-detail.icon")}
            ></ha-icon-picker>
            <ha-color-picker
              .value=${this._color}
              .configValue=${"color"}
              @value-changed=${this._valueChanged}
              .label=${this.localize("ui.dialogs.label-detail.color")}
            ></ha-color-picker>
            <ha-textarea
              .value=${this._description}
              .configValue=${"description"}
              @input=${this._input}
              .label=${this.localize("ui.dialogs.label-detail.description")}
            ></ha-textarea>
          </div>
        </div>

        <ha-dialog-footer slot="footer">
          ${this.params.entry && this.params.removeEntry
            ? html`
                <ha-button
                  slot="secondaryAction"
                  variant="danger"
                  appearance="plain"
                  @click=${this._deleteEntry}
                  .disabled=${this._submitting}
                >
                  ${this.localize("ui.common.delete")}
                </ha-button>
              `
            : html`
                <ha-button
                  appearance="plain"
                  slot="secondaryAction"
                  @click=${this.closeDialog}
                >
                  ${this.localize("ui.common.cancel")}
                </ha-button>
              `}
          <ha-button
            slot="primaryAction"
            @click=${this._updateEntry}
            .disabled=${this._submitting || !this._name}
          >
            ${this.params.entry
              ? this.localize("ui.common.update")
              : this.localize("ui.common.create")}
          </ha-button>
        </ha-dialog-footer>
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
      if (this.params!.entry) {
        await this.params!.updateEntry!(values);
      } else {
        await this.params!.createEntry!(values);
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
      if (await this.params!.removeEntry!()) {
        this.params = undefined;
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
