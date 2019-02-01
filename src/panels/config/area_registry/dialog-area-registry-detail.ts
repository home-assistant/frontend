import {
  LitElement,
  html,
  css,
  PropertyDeclarations,
  CSSResult,
  TemplateResult,
} from "lit-element";
import "@polymer/paper-dialog/paper-dialog";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-input/paper-input";

import { AreaRegistryDetailDialogParams } from "./show-dialog-area-registry-detail";
import { PolymerChangedEvent } from "../../../polymer-types";
import { haStyleDialog } from "../../../resources/ha-style";
import { HomeAssistant } from "../../../types";
import { AreaRegistryEntryMutableParams } from "../../../data/area_registry";

class DialogAreaDetail extends LitElement {
  public hass!: HomeAssistant;
  private _name!: string;
  private _error?: string;
  private _params?: AreaRegistryDetailDialogParams;
  private _submitting?: boolean;

  static get properties(): PropertyDeclarations {
    return {
      _error: {},
      _name: {},
      _params: {},
    };
  }

  public async showDialog(
    params: AreaRegistryDetailDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._name = this._params.entry ? this._params.entry.name : "";
    await this.updateComplete;
  }

  protected render(): TemplateResult | void {
    if (!this._params) {
      return html``;
    }
    const nameInvalid = this._name.trim() === "";
    return html`
      <paper-dialog
        with-backdrop
        opened
        @opened-changed="${this._openedChanged}"
      >
        <h2>${this._params.entry ? this._params.entry.name : "New Area"}</h2>
        <paper-dialog-scrollable>
          ${this._error
            ? html`
                <div class="error">${this._error}</div>
              `
            : ""}
          <div class="form">
            <paper-input
              .value=${this._name}
              @value-changed=${this._nameChanged}
              label="Name"
              error-message="Name is required"
              .invalid=${nameInvalid}
            ></paper-input>
          </div>
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          ${this._params.entry
            ? html`
                <paper-button
                  class="danger"
                  @click="${this._deleteEntry}"
                  .disabled=${this._submitting}
                >
                  DELETE
                </paper-button>
              `
            : html``}
          <paper-button
            @click="${this._updateEntry}"
            .disabled=${nameInvalid || this._submitting}
          >
            ${this._params.entry ? "UPDATE" : "CREATE"}
          </paper-button>
        </div>
      </paper-dialog>
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
        await this._params!.updateEntry(values);
      } else {
        await this._params!.createEntry(values);
      }
      this._params = undefined;
    } catch (err) {
      this._error = err;
    } finally {
      this._submitting = false;
    }
  }

  private async _deleteEntry() {
    this._submitting = true;
    try {
      if (await this._params!.removeEntry()) {
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
        paper-dialog {
          min-width: 400px;
        }
        .form {
          padding-bottom: 24px;
        }
        paper-button {
          font-weight: 500;
        }
        paper-button.danger {
          font-weight: 500;
          color: var(--google-red-500);
          margin-left: -12px;
          margin-right: auto;
        }
        .error {
          color: var(--google-red-500);
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
