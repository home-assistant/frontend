import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-wa-dialog";
import "../../../components/ha-dialog-footer";
import { updateEntityRegistryEntry } from "../../../data/entity/entity_registry";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import "./ha-category-picker";
import type { AssignCategoryDialogParams } from "./show-dialog-assign-category";

@customElement("dialog-assign-category")
class DialogAssignCategory extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _scope?: string;

  @state() private _category?: string;

  @state() private _error?: string;

  @state() private _params?: AssignCategoryDialogParams;

  @state() private _submitting?: boolean;

  @state() private _open = false;

  public showDialog(params: AssignCategoryDialogParams): void {
    this._params = params;
    this._scope = params.scope;
    this._category = params.entityReg.categories[params.scope];
    this._error = undefined;
    this._open = true;
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._error = "";
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    const entry = this._params.entityReg.categories[this._params.scope];
    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${entry
          ? this.hass.localize("ui.panel.config.category.assign.edit")
          : this.hass.localize("ui.panel.config.category.assign.assign")}
        @closed=${this._dialogClosed}
      >
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : ""}
        <div class="form">
          <ha-category-picker
            .hass=${this.hass}
            .scope=${this._scope}
            .label=${this.hass.localize(
              "ui.components.category-picker.category"
            )}
            .value=${this._category}
            @value-changed=${this._categoryChanged}
            autofocus
          ></ha-category-picker>
        </div>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            @click=${this._updateEntry}
            .disabled=${!!this._submitting}
          >
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  private _categoryChanged(ev: CustomEvent): void {
    if (!ev.detail.value) {
      this._category = undefined;
    }
    this._category = ev.detail.value;
  }

  private async _updateEntry() {
    this._submitting = true;
    this._error = undefined;
    try {
      await updateEntityRegistryEntry(
        this.hass,
        this._params!.entityReg.entity_id,
        {
          categories: { [this._scope!]: this._category || null },
        }
      );
      this.closeDialog();
    } catch (err: any) {
      this._error =
        err.message ||
        this.hass.localize("ui.panel.config.category.assign.unknown_error");
    } finally {
      this._submitting = false;
    }
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
    "dialog-assign-category": DialogAssignCategory;
  }
}
