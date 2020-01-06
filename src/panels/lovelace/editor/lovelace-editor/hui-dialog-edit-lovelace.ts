import {
  html,
  css,
  LitElement,
  TemplateResult,
  CSSResult,
  customElement,
  property,
} from "lit-element";
import "@polymer/paper-spinner/paper-spinner";
import "../../../../components/dialog/ha-paper-dialog";
// tslint:disable-next-line:no-duplicate-imports
import { HaPaperDialog } from "../../../../components/dialog/ha-paper-dialog";
import "@material/mwc-button";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";

import { haStyleDialog } from "../../../../resources/styles";

import "./hui-lovelace-editor";
import { HomeAssistant } from "../../../../types";
import { LovelaceConfig } from "../../../../data/lovelace";
import { Lovelace } from "../../types";

@customElement("hui-dialog-edit-lovelace")
export class HuiDialogEditLovelace extends LitElement {
  @property() public hass?: HomeAssistant;

  @property() private _lovelace?: Lovelace;

  private _config?: LovelaceConfig;

  private _saving: boolean;

  public constructor() {
    super();
    this._saving = false;
  }

  public async showDialog(lovelace: Lovelace): Promise<void> {
    this._lovelace = lovelace;
    if (this._dialog == null) {
      await this.updateComplete;
    }

    const { views, ...lovelaceConfig } = this._lovelace!.config;
    this._config = lovelaceConfig as LovelaceConfig;

    this._dialog.open();
  }

  private get _dialog(): HaPaperDialog {
    return this.shadowRoot!.querySelector("ha-paper-dialog")!;
  }

  protected render(): TemplateResult | void {
    return html`
      <ha-paper-dialog with-backdrop modal>
        <h2>
          ${this.hass!.localize(
            "ui.panel.lovelace.editor.edit_lovelace.header"
          )}
        </h2>
        <paper-dialog-scrollable>
          ${this.hass!.localize(
            "ui.panel.lovelace.editor.edit_lovelace.explanation"
          )}
          <hui-lovelace-editor
            .hass="${this.hass}"
            .config="${this._config}"
            @lovelace-config-changed="${this._ConfigChanged}"
          ></hui-lovelace-editor
        ></paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          <mwc-button @click="${this._closeDialog}"
            >${this.hass!.localize("ui.common.cancel")}</mwc-button
          >
          <mwc-button
            ?disabled="${!this._config || this._saving}"
            @click="${this._save}"
          >
            <paper-spinner
              ?active="${this._saving}"
              alt="Saving"
            ></paper-spinner>
            ${this.hass!.localize("ui.common.save")}</mwc-button
          >
        </div>
      </ha-paper-dialog>
    `;
  }

  private _closeDialog(): void {
    this._config = undefined;
    this._dialog.close();
  }

  private async _save(): Promise<void> {
    if (!this._config) {
      return;
    }
    if (!this._isConfigChanged()) {
      this._closeDialog();
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
      this._closeDialog();
    } catch (err) {
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
        mwc-button paper-spinner {
          width: 14px;
          height: 14px;
          margin-right: 20px;
        }
        paper-spinner {
          display: none;
        }
        paper-spinner[active] {
          display: block;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-edit-lovelace": HuiDialogEditLovelace;
  }
}
