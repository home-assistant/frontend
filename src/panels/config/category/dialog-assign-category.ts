import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-icon-picker";
import "../../../components/ha-settings-row";
import "../../../components/ha-textfield";
import "../../../components/ha-button";
import { updateEntityRegistryEntry } from "../../../data/entity_registry";
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

  public showDialog(params: AssignCategoryDialogParams): void {
    this._params = params;
    this._scope = params.scope;
    this._category = params.entityReg.categories[params.scope];
    this._error = undefined;
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
    const entry = this._params.entityReg.categories[this._params.scope];
    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          entry
            ? this.hass.localize("ui.panel.config.category.assign.edit")
            : this.hass.localize("ui.panel.config.category.assign.assign")
        )}
      >
        <div>
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}
          <div class="form">
            <ha-category-picker
              .hass=${this.hass}
              .scope=${this._scope}
              .value=${this._category}
              @value-changed=${this._categoryChanged}
            ></ha-category-picker>
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
          .disabled=${!!this._submitting}
        >
          ${this.hass.localize("ui.common.save")}
        </ha-button>
      </ha-dialog>
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
