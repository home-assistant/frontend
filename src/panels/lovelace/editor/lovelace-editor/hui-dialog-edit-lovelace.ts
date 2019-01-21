import {
  html,
  css,
  LitElement,
  PropertyDeclarations,
  TemplateResult,
  CSSResult,
} from "lit-element";
import "@polymer/paper-spinner/paper-spinner";
import "@polymer/paper-dialog/paper-dialog";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { PaperDialogElement } from "@polymer/paper-dialog/paper-dialog";
import "@polymer/paper-button/paper-button";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";

import { haStyleDialog } from "../../../../resources/ha-style";

import "./hui-lovelace-editor";
import { HomeAssistant } from "../../../../types";
import { LovelaceConfig } from "../../../../data/lovelace";
import { hassLocalizeLitMixin } from "../../../../mixins/lit-localize-mixin";
import { Lovelace } from "../../types";

export class HuiDialogEditLovelace extends hassLocalizeLitMixin(LitElement) {
  public hass?: HomeAssistant;
  private _lovelace?: Lovelace;
  private _config?: LovelaceConfig;
  private _saving: boolean;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _lovelace: {},
    };
  }

  protected constructor() {
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

  private get _dialog(): PaperDialogElement {
    return this.shadowRoot!.querySelector("paper-dialog")!;
  }

  protected render(): TemplateResult | void {
    return html`
      <paper-dialog with-backdrop>
        <h2>Edit Lovelace</h2>
        <paper-dialog-scrollable>
          <hui-lovelace-editor
            .hass="${this.hass}"
            .config="${this._config}"
            @lovelace-config-changed="${this._ConfigChanged}"
          ></hui-lovelace-editor
        ></paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          <paper-button @click="${this._closeDialog}"
            >${this.localize("ui.common.cancel")}</paper-button
          >
          <paper-button
            ?disabled="${!this._config || this._saving}"
            @click="${this._save}"
          >
            <paper-spinner
              ?active="${this._saving}"
              alt="Saving"
            ></paper-spinner>
            ${this.localize("ui.common.save")}</paper-button
          >
        </div>
      </paper-dialog>
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
          paper-dialog {
            max-height: 100%;
            height: 100%;
          }
        }
        @media all and (min-width: 660px) {
          paper-dialog {
            width: 650px;
          }
        }
        paper-dialog {
          max-width: 650px;
        }
        paper-button paper-spinner {
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

customElements.define("hui-dialog-edit-lovelace", HuiDialogEditLovelace);
