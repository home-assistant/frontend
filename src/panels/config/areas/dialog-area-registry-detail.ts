import "@material/mwc-button";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-input/paper-input";
import {
  css,
  CSSResult,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../../components/dialog/ha-paper-dialog";
import { AreaRegistryEntryMutableParams } from "../../../data/area_registry";
import { PolymerChangedEvent } from "../../../polymer-types";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { AreaRegistryDetailDialogParams } from "./show-dialog-area-registry-detail";

class DialogAreaDetail extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() private _name!: string;

  @property() private _error?: string;

  @property() private _params?: AreaRegistryDetailDialogParams;

  @property() private _submitting?: boolean;

  public async showDialog(
    params: AreaRegistryDetailDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._name = this._params.entry ? this._params.entry.name : "";
    await this.updateComplete;
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    const entry = this._params.entry;
    const nameInvalid = this._name.trim() === "";
    return html`
      <ha-paper-dialog
        with-backdrop
        opened
        @opened-changed="${this._openedChanged}"
      >
        <h2>
          ${entry
            ? entry.name
            : this.hass.localize("ui.panel.config.areas.editor.default_name")}
        </h2>
        <paper-dialog-scrollable>
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
              .label=${this.hass.localize("ui.panel.config.areas.editor.name")}
              .errorMessage=${this.hass.localize(
                "ui.panel.config.areas.editor.name_required"
              )}
              .invalid=${nameInvalid}
            ></paper-input>
          </div>
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          ${entry
            ? html`
                <mwc-button
                  class="warning"
                  @click="${this._deleteEntry}"
                  .disabled=${this._submitting}
                >
                  ${this.hass.localize("ui.panel.config.areas.editor.delete")}
                </mwc-button>
              `
            : html``}
          <mwc-button
            @click="${this._updateEntry}"
            .disabled=${nameInvalid || this._submitting}
          >
            ${entry
              ? this.hass.localize("ui.panel.config.areas.editor.update")
              : this.hass.localize("ui.panel.config.areas.editor.create")}
          </mwc-button>
        </div>
      </ha-paper-dialog>
    `;
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
    } catch (err) {
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
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>): void {
    if (!(ev.detail as any).value) {
      this._params = undefined;
    }
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        .form {
          padding-bottom: 24px;
        }
        mwc-button.warning {
          margin-right: auto;
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
