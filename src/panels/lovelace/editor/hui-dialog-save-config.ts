import "@material/mwc-button";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "../../../components/ha-spinner";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  query,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/dialog/ha-paper-dialog";
import type { HaPaperDialog } from "../../../components/dialog/ha-paper-dialog";
import "../../../components/ha-switch";
import "../../../components/ha-formfield";
import "../../../components/ha-yaml-editor";
import type { PolymerChangedEvent } from "../../../polymer-types";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { SaveDialogParams } from "./show-save-config-dialog";

const EMPTY_CONFIG = { views: [] };

@customElement("hui-dialog-save-config")
export class HuiSaveConfig extends LitElement {
  @property() public hass?: HomeAssistant;

  @property() private _params?: SaveDialogParams;

  @property() private _emptyConfig = false;

  @property() private _saving: boolean;

  @query("ha-paper-dialog") private _dialog?: HaPaperDialog;

  public constructor() {
    super();
    this._saving = false;
  }

  public async showDialog(params: SaveDialogParams): Promise<void> {
    this._params = params;
    this._emptyConfig = false;
    await this.updateComplete;
    this._dialog!.open();
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    return html`
      <ha-paper-dialog
        with-backdrop
        opened
        @opened-changed=${this._openedChanged}
      >
        <h2>
          ${this.hass!.localize("ui.panel.lovelace.editor.save_config.header")}
        </h2>
        <paper-dialog-scrollable>
          <p>
            ${this.hass!.localize("ui.panel.lovelace.editor.save_config.para")}
          </p>

          ${this._params.mode === "storage"
            ? html`
                <p>
                  ${this.hass!.localize(
                    "ui.panel.lovelace.editor.save_config.para_sure"
                  )}
                </p>
                <ha-formfield
                  .label=${this.hass!.localize(
                    "ui.panel.lovelace.editor.save_config.empty_config"
                  )}
                >
                  <ha-switch
                    .checked=${this._emptyConfig}
                    @change=${this._emptyConfigChanged}
                  ></ha-switch
                ></ha-formfield>
              `
            : html`
                <p>
                  ${this.hass!.localize(
                    "ui.panel.lovelace.editor.save_config.yaml_mode"
                  )}
                </p>
                <p>
                  ${this.hass!.localize(
                    "ui.panel.lovelace.editor.save_config.yaml_control"
                  )}
                </p>
                <p>
                  ${this.hass!.localize(
                    "ui.panel.lovelace.editor.save_config.yaml_config"
                  )}
                </p>
                <ha-yaml-editor
                  .defaultValue=${this._params!.lovelace.config}
                  @editor-refreshed=${this._editorRefreshed}
                ></ha-yaml-editor>
              `}
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          ${this._params.mode === "storage"
            ? html`
                <mwc-button @click="${this._closeDialog}"
                  >${this.hass!.localize(
                    "ui.panel.lovelace.editor.save_config.cancel"
                  )}
                </mwc-button>
                <mwc-button
                  ?disabled="${this._saving}"
                  @click="${this._saveConfig}"
                >
                  <ha-spinner
                    ?active="${this._saving}"
                    alt="Saving"
                  ></ha-spinner>
                  ${this.hass!.localize(
                    "ui.panel.lovelace.editor.save_config.save"
                  )}
                </mwc-button>
              `
            : html`
                <mwc-button @click=${this._closeDialog}
                  >${this.hass!.localize(
                    "ui.panel.lovelace.editor.save_config.close"
                  )}
                </mwc-button>
              `}
        </div>
      </ha-paper-dialog>
    `;
  }

  private _closeDialog(): void {
    this._dialog!.close();
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>): void {
    if (!ev.detail.value) {
      this._params = undefined;
    }
  }

  private _editorRefreshed() {
    fireEvent(this._dialog! as HTMLElement, "iron-resize");
  }

  private _emptyConfigChanged(ev) {
    this._emptyConfig = ev.target.checked;
  }

  private async _saveConfig(): Promise<void> {
    if (!this.hass || !this._params) {
      return;
    }
    this._saving = true;
    try {
      const lovelace = this._params!.lovelace;
      await lovelace.saveConfig(
        this._emptyConfig ? EMPTY_CONFIG : lovelace.config
      );
      lovelace.setEditMode(true);
      this._saving = false;
      this._closeDialog();
    } catch (err) {
      alert(`Saving failed: ${err.message}`);
      this._saving = false;
    }
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        @media all and (max-width: 450px), all and (max-height: 500px) {
          /* overrule the ha-style-dialog max-height on small screens */
          ha-paper-dialog {
            max-height: 100%;
            height: 100%;
          }
        }
        @media all and (min-width: 660px) {
          ha-paper-dialog {
            width: 650px;
          }
        }
        ha-paper-dialog {
          max-width: 650px;
        }
        ha-spinner {
          display: none;
        }
        ha-spinner[active] {
          display: block;
        }
        mwc-button ha-spinner {
          width: 14px;
          height: 14px;
          margin-right: 20px;
        }
        ha-switch {
          padding-bottom: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-save-config": HuiSaveConfig;
  }
}
