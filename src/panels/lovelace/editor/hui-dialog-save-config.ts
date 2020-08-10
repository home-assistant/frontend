import "@material/mwc-button";
import "@material/mwc-icon-button/mwc-icon-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
} from "lit-element";
import { mdiHelpCircle } from "@mdi/js";
import { fireEvent } from "../../../common/dom/fire_event";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { SaveDialogParams } from "./show-save-config-dialog";
import { computeRTLDirection } from "../../../common/util/compute_rtl";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import "../../../components/ha-switch";
import "../../../components/ha-formfield";
import "../../../components/ha-yaml-editor";
import "../../../components/ha-svg-icon";
import "../../../components/ha-dialog";
import "../../../components/ha-circular-progress";

const EMPTY_CONFIG = { views: [] };

const coreDocumentationURLBase = "https://www.home-assistant.io/lovelace/";

@customElement("hui-dialog-save-config")
export class HuiSaveConfig extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @internalProperty() private _params?: SaveDialogParams;

  @internalProperty() private _emptyConfig = false;

  @internalProperty() private _saving: boolean;

  public constructor() {
    super();
    this._saving = false;
  }

  public showDialog(params: SaveDialogParams): void {
    this._params = params;
    this._emptyConfig = false;
  }

  public closeDialog(): boolean {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
    return true;
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        @closed=${this._close}
        .heading=${html`${this.hass!.localize(
            "ui.panel.lovelace.editor.save_config.header"
          )}<a
            class="header_button"
            href=${coreDocumentationURLBase}
            title=${this.hass!.localize("ui.panel.lovelace.menu.help")}
            target="_blank"
            rel="noreferrer"
            dir=${computeRTLDirection(this.hass!)}
          >
            <mwc-icon-button>
              <ha-svg-icon path=${mdiHelpCircle}></ha-svg-icon>
            </mwc-icon-button>
          </a>`}
      >
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
                  .dir=${computeRTLDirection(this.hass!)}
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
                ></ha-yaml-editor>
              `}
        </div>
        ${this._params.mode === "storage"
          ? html`
              <mwc-button slot="primaryAction" @click=${this.closeDialog}
                >${this.hass!.localize(
                  "ui.panel.lovelace.editor.save_config.cancel"
                )}
              </mwc-button>
              <mwc-button
                slot="primaryAction"
                ?disabled=${this._saving}
                @click=${this._saveConfig}
              >
                <ha-circular-progress
                  ?active=${this._saving}
                  alt="Saving"
                ></ha-circular-progress>
                ${this.hass!.localize(
                  "ui.panel.lovelace.editor.save_config.save"
                )}
              </mwc-button>
            `
          : html`
              <mwc-button slot="primaryAction" @click=${this.closeDialog}
                >${this.hass!.localize(
                  "ui.panel.lovelace.editor.save_config.close"
                )}
              </mwc-button>
            `}
      </ha-dialog>
    `;
  }

  private _close(ev?: Event) {
    if (ev) {
      ev.stopPropagation();
    }
    this.closeDialog();
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
      this.closeDialog();
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
        ha-circular-progress {
          display: none;
        }
        ha-circular-progress[active] {
          display: block;
        }
        mwc-button ha-circular-progress {
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
