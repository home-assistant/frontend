import "@material/mwc-button";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { navigate } from "../../../common/navigate";
import "../../../components/ha-dialog";
import { AreaRegistryEntryMutableParams } from "../../../data/area_registry";
import { PolymerChangedEvent } from "../../../polymer-types";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { AreaRegistryDetailDialogParams } from "./show-dialog-area-registry-detail";

class DialogAreaDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _name!: string;

  @state() private _error?: string;

  @state() private _params?: AreaRegistryDetailDialogParams;

  @state() private _submitting?: boolean;

  public async showDialog(
    params: AreaRegistryDetailDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._name = this._params.entry ? this._params.entry.name : "";
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._error = "";
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    const entry = this._params.entry;
    const nameInvalid = !this._isNameValid();
    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${entry
          ? entry.name
          : this.hass.localize("ui.panel.config.areas.editor.default_name")}
      >
        <div>
          ${this._error ? html` <div class="error">${this._error}</div> ` : ""}
          <div class="form">
            ${entry
              ? html`
                  <div>
                    ${this.hass.localize(
                      "ui.panel.config.areas.editor.area_id"
                    )}:
                    ${entry.area_id}
                  </div>
                `
              : ""}

            <paper-input
              .value=${this._name}
              @value-changed=${this._nameChanged}
              @keyup=${this._handleKeyup}
              .label=${this.hass.localize("ui.panel.config.areas.editor.name")}
              .errorMessage=${this.hass.localize(
                "ui.panel.config.areas.editor.name_required"
              )}
              .invalid=${nameInvalid}
            ></paper-input>
          </div>
        </div>
        ${entry
          ? html`
              <mwc-button
                slot="secondaryAction"
                class="warning"
                @click=${this._deleteEntry}
                .disabled=${this._submitting}
              >
                ${this.hass.localize("ui.panel.config.areas.editor.delete")}
              </mwc-button>
            `
          : html``}
        <mwc-button
          slot="primaryAction"
          @click=${this._updateEntry}
          .disabled=${nameInvalid || this._submitting}
        >
          ${entry
            ? this.hass.localize("ui.panel.config.areas.editor.update")
            : this.hass.localize("ui.panel.config.areas.editor.create")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _isNameValid() {
    return this._name.trim() !== "";
  }

  private _handleKeyup(ev: KeyboardEvent) {
    if (ev.keyCode === 13 && this._isNameValid() && !this._submitting) {
      this._updateEntry();
    }
  }

  private _nameChanged(ev: PolymerChangedEvent<string>) {
    this._error = undefined;
    this._name = ev.detail.value;
  }

  private async _updateEntry() {
    this._submitting = true;
    try {
      const values: AreaRegistryEntryMutableParams = {
        name: this._name.trim(),
      };
      if (this._params!.entry) {
        await this._params!.updateEntry!(values);
      } else {
        await this._params!.createEntry!(values);
      }
      this._params = undefined;
    } catch (err: any) {
      this._error =
        err.message ||
        this.hass.localize("ui.panel.config.areas.editor.unknown_error");
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

    navigate("/config/areas/dashboard");
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .form {
          padding-bottom: 24px;
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
    "dialog-area-registry-detail": DialogAreaDetail;
  }
}

customElements.define("dialog-area-registry-detail", DialogAreaDetail);
