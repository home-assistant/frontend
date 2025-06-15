import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-icon-picker";
import "../../../components/ha-settings-row";
import "../../../components/ha-button";
import "../../../components/ha-textfield";
import type {
  CategoryRegistryEntry,
  CategoryRegistryEntryMutableParams,
} from "../../../data/category_registry";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { CategoryRegistryDetailDialogParams } from "./show-dialog-category-registry-detail";

@customElement("dialog-category-registry-detail")
class DialogCategoryDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _name!: string;

  @state() private _icon!: string | null;

  @state() private _error?: string;

  @state() private _params?: CategoryRegistryDetailDialogParams;

  @state() private _submitting?: boolean;

  public async showDialog(
    params: CategoryRegistryDetailDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = undefined;
    if (this._params.entry) {
      this._name = this._params.entry.name || "";
      this._icon = this._params.entry.icon || null;
    } else {
      this._name = this._params.suggestedName || "";
      this._icon = null;
    }
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._error = "";
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    const entry = this._params.entry;
    const nameInvalid = !this._isNameValid();
    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          entry
            ? this.hass.localize("ui.panel.config.category.editor.edit")
            : this.hass.localize("ui.panel.config.category.editor.create")
        )}
      >
        <div>
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}
          <div class="form">
            <ha-textfield
              .value=${this._name}
              @input=${this._nameChanged}
              .label=${this.hass.localize(
                "ui.panel.config.category.editor.name"
              )}
              .validationMessage=${this.hass.localize(
                "ui.panel.config.category.editor.required_error_msg"
              )}
              required
              dialogInitialFocus
            ></ha-textfield>

            <ha-icon-picker
              .hass=${this.hass}
              .value=${this._icon}
              @value-changed=${this._iconChanged}
              .label=${this.hass.localize(
                "ui.panel.config.category.editor.icon"
              )}
            ></ha-icon-picker>
          </div>
        </div>
        <ha-button
          appearance="plain"
          slot="primaryAction"
          @click=${this.closeDialog}
        >
          ${this.hass.localize("ui.common.cancel")}
        </ha-button>
        <ha-button
          slot="primaryAction"
          @click=${this._updateEntry}
          .disabled=${nameInvalid || !!this._submitting}
        >
          ${entry
            ? this.hass.localize("ui.common.save")
            : this.hass.localize("ui.common.add")}
        </ha-button>
      </ha-dialog>
    `;
  }

  private _isNameValid() {
    return this._name.trim() !== "";
  }

  private _nameChanged(ev) {
    this._error = undefined;
    this._name = ev.target.value;
  }

  private _iconChanged(ev) {
    this._error = undefined;
    this._icon = ev.detail.value;
  }

  private async _updateEntry() {
    const create = !this._params!.entry;
    this._submitting = true;
    let newValue: CategoryRegistryEntry | undefined;
    try {
      const values: CategoryRegistryEntryMutableParams = {
        name: this._name.trim(),
        icon: this._icon || (create ? undefined : null),
      };
      if (create) {
        newValue = await this._params!.createEntry!(values);
      } else {
        newValue = await this._params!.updateEntry!(values);
      }
      this.closeDialog();
    } catch (err: any) {
      this._error =
        err.message ||
        this.hass.localize("ui.panel.config.category.editor.unknown_error");
    } finally {
      this._submitting = false;
    }
    return newValue;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-textfield,
        ha-icon-picker {
          display: block;
          margin-bottom: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-category-registry-detail": DialogCategoryDetail;
  }
}
