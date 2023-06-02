import "@material/mwc-button/mwc-button";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-alert";
import "../../components/ha-dialog";
import { haStyle, haStyleDialog } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import { AliasesDialogParams } from "./show-dialog-aliases";
import "../../components/ha-aliases-editor";

@customElement("dialog-aliases")
class DialogAliases extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _error?: string;

  @state() private _params?: AliasesDialogParams;

  @state() private _aliases!: string[];

  @state() private _submitting = false;

  public async showDialog(params: AliasesDialogParams): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._aliases =
      this._params.aliases?.length > 0
        ? [...this._params.aliases].sort()
        : [""];
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

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${this.hass.localize("ui.dialogs.aliases.heading", {
          name: this._params.name,
        })}
      >
        <div>
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}
          <ha-aliases-editor
            .hass=${this.hass}
            .aliases=${this._aliases}
            @value-changed=${this._aliasesChanged}
          ></ha-aliases-editor>
        </div>
        <mwc-button
          slot="secondaryAction"
          @click=${this.closeDialog}
          .disabled=${this._submitting}
        >
          ${this.hass.localize("ui.common.cancel")}
        </mwc-button>
        <mwc-button
          slot="primaryAction"
          @click=${this._updateAliases}
          .disabled=${this._submitting}
        >
          ${this.hass.localize("ui.dialogs.aliases.save")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _aliasesChanged(ev: CustomEvent): void {
    this._aliases = ev.detail.value;
  }

  private async _updateAliases(): Promise<void> {
    this._submitting = true;
    const noEmptyAliases = this._aliases
      .map((alias) => alias.trim())
      .filter((alias) => alias);

    try {
      await this._params!.updateAliases(noEmptyAliases);
      this.closeDialog();
    } catch (err: any) {
      this._error =
        err.message || this.hass.localize("ui.dialogs.aliases.unknown_error");
    } finally {
      this._submitting = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        .row {
          margin-bottom: 8px;
        }
        ha-textfield {
          display: block;
        }
        ha-icon-button {
          display: block;
        }
        mwc-button {
          margin-left: 8px;
        }
        #alias_input {
          margin-top: 8px;
        }
        .alias {
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          margin-top: 4px;
          --mdc-icon-button-size: 24px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-aliases": DialogAliases;
  }
}
