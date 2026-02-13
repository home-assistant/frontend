import { mdiHelpCircle } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-dialog";
import "../../../components/ha-formfield";
import "../../../components/ha-icon-button";
import "../../../components/ha-switch";
import "../../../components/ha-yaml-editor";
import type { LovelaceConfig } from "../../../data/lovelace/config/types";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { expandLovelaceConfigStrategies } from "../strategies/get-strategy";
import type { SaveDialogParams } from "./show-save-config-dialog";

const EMPTY_CONFIG: LovelaceConfig = { views: [{ title: "Home" }] };

@customElement("hui-dialog-save-config")
export class HuiSaveConfig extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _params?: SaveDialogParams;

  @state() private _emptyConfig = false;

  @state() private _saving: boolean;

  @state() private _open = false;

  public constructor() {
    super();
    this._saving = false;
  }

  public showDialog(params: SaveDialogParams): void {
    this._params = params;
    this._emptyConfig = false;
    this._open = true;
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const heading = this.hass!.localize(
      "ui.panel.lovelace.editor.save_config.header"
    );
    return html`
      <ha-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${heading}
        width="medium"
        @closed=${this._dialogClosed}
      >
        <a
          href=${documentationUrl(this.hass!, "/lovelace/")}
          title=${this.hass!.localize("ui.panel.lovelace.menu.help")}
          target="_blank"
          rel="noreferrer"
          slot="headerActionItems"
        >
          <ha-icon-button
            .path=${mdiHelpCircle}
            .label=${this.hass!.localize("ui.common.help")}
          ></ha-icon-button>
        </a>
        <div>
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
                    autofocus
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
                  .hass=${this.hass}
                  .defaultValue=${this._params!.lovelace.config}
                  autofocus
                ></ha-yaml-editor>
              `}
        </div>
        ${this._params.mode === "storage"
          ? html`
              <ha-dialog-footer slot="footer">
                <ha-button
                  slot="secondaryAction"
                  appearance="plain"
                  @click=${this.closeDialog}
                >
                  ${this.hass!.localize("ui.common.cancel")}
                </ha-button>
                <ha-button
                  slot="primaryAction"
                  @click=${this._saveConfig}
                  .loading=${this._saving}
                >
                  ${this.hass!.localize(
                    "ui.panel.lovelace.editor.save_config.save"
                  )}
                </ha-button>
              </ha-dialog-footer>
            `
          : html`
              <ha-dialog-footer slot="footer">
                <ha-button slot="primaryAction" @click=${this.closeDialog}>
                  ${this.hass!.localize(
                    "ui.panel.lovelace.editor.save_config.close"
                  )}
                </ha-button>
              </ha-dialog-footer>
            `}
      </ha-dialog>
    `;
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
        this._emptyConfig
          ? EMPTY_CONFIG
          : await expandLovelaceConfigStrategies(lovelace.config, this.hass)
      );
      lovelace.setEditMode(true);
      this._saving = false;
      this.closeDialog();
    } catch (err: any) {
      alert(`Saving failed: ${err.message}`);
      this._saving = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 0 24px 24px 24px;
        }

        ha-dialog [slot="headerActionItems"] {
          color: inherit;
          text-decoration: none;
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
