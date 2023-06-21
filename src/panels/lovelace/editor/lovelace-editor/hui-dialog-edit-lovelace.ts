import "@material/mwc-button";
import { CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-circular-progress";
import "../../../../components/ha-dialog";
import type { LovelaceConfig } from "../../../../data/lovelace";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { Lovelace } from "../../types";
import "./hui-lovelace-editor";

@customElement("hui-dialog-edit-lovelace")
export class HuiDialogEditLovelace extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _lovelace?: Lovelace;

  @state() private _config?: LovelaceConfig;

  private _saving = false;

  public showDialog(lovelace: Lovelace): void {
    this._lovelace = lovelace;
    const { views, ...lovelaceConfig } = this._lovelace!.config;
    this._config = lovelaceConfig as LovelaceConfig;
  }

  public closeDialog(): void {
    this._config = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }
    return html`
      <ha-dialog
        open
        .heading=${this.hass!.localize(
          "ui.panel.lovelace.editor.edit_lovelace.header"
        )}
      >
        <div>
          ${this.hass!.localize(
            "ui.panel.lovelace.editor.edit_lovelace.explanation"
          )}
          <hui-lovelace-editor
            .hass=${this.hass}
            .config=${this._config}
            @lovelace-config-changed=${this._ConfigChanged}
            dialogInitialFocus
          ></hui-lovelace-editor>
        </div>
        <mwc-button @click=${this.closeDialog} slot="secondaryAction">
          ${this.hass!.localize("ui.common.cancel")}
        </mwc-button>
        <mwc-button
          .disabled=${!this._config || this._saving}
          @click=${this._save}
          slot="primaryAction"
        >
          ${this._saving
            ? html`<ha-circular-progress
                active
                size="small"
                title="Saving"
              ></ha-circular-progress>`
            : ""}
          ${this.hass!.localize("ui.common.save")}</mwc-button
        >
      </ha-dialog>
    `;
  }

  private async _save(): Promise<void> {
    if (!this._config) {
      return;
    }
    if (!this._isConfigChanged()) {
      this.closeDialog();
      return;
    }

    this._saving = true;
    const lovelace = this._lovelace!;

    const config: LovelaceConfig = {
      ...lovelace.config,
      ...this._config,
    };

    try {
      await lovelace.saveConfig(config);
      this.closeDialog();
    } catch (err: any) {
      alert(`Saving failed: ${err.message}`);
    } finally {
      this._saving = false;
    }
  }

  private _ConfigChanged(ev: CustomEvent): void {
    if (ev.detail && ev.detail.config) {
      this._config = ev.detail.config;
    }
  }

  private _isConfigChanged(): boolean {
    const { views, ...lovelaceConfig } = this._lovelace!.config;
    return JSON.stringify(this._config) !== JSON.stringify(lovelaceConfig);
  }

  static get styles(): CSSResultGroup {
    return haStyleDialog;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-edit-lovelace": HuiDialogEditLovelace;
  }
}
