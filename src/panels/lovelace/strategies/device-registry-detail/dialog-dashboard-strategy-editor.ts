import {
  mdiAccountHardHat,
  mdiClose,
  mdiCodeBraces,
  mdiDotsVertical,
} from "@mdi/js";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { HASSDomEvent, fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/ha-button";
import "../../../../components/ha-button-menu";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-icon-button";
import { LovelaceStrategyConfig } from "../../../../data/lovelace/config/strategy";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showSaveSuccessToast } from "../../../../util/toast-saved-success";
import "../../editor/dashboard-strategy-editor/hui-dashboard-strategy-element-editor";
import type { HuiDashboardStrategyElementEditor } from "../../editor/dashboard-strategy-editor/hui-dashboard-strategy-element-editor";
import { ConfigChangedEvent } from "../../editor/hui-element-editor";
import { GUIModeChangedEvent } from "../../editor/types";
import { cleanLegacyStrategyConfig } from "../legacy-strategy";
import type { DashboardStrategyEditorDialogParams } from "./show-dialog-dashboard-strategy-editor";

@customElement("dialog-dashboard-strategy-editor")
class DialogDashboardStrategyEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: DashboardStrategyEditorDialogParams;

  @state() private _strategyConfig?: LovelaceStrategyConfig;

  @state() private _GUImode = true;

  @state() private _guiModeAvailable? = true;

  @query("hui-dashboard-strategy-element-editor")
  private _strategyEditorEl?: HuiDashboardStrategyElementEditor;

  public async showDialog(
    params: DashboardStrategyEditorDialogParams
  ): Promise<void> {
    this._params = params;
    this._strategyConfig = params.config.strategy;
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._params = undefined;
    this._strategyConfig = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _handleConfigChanged(ev: HASSDomEvent<ConfigChangedEvent>) {
    ev.stopPropagation();
    this._guiModeAvailable = ev.detail.guiModeAvailable;
    this._strategyConfig = ev.detail.config as LovelaceStrategyConfig;
  }

  private _handleGUIModeChanged(ev: HASSDomEvent<GUIModeChangedEvent>): void {
    ev.stopPropagation();
    this._GUImode = ev.detail.guiMode;
    this._guiModeAvailable = ev.detail.guiModeAvailable;
  }

  private _toggleMode(): void {
    this._strategyEditorEl?.toggleMode();
  }

  private _opened() {
    this._strategyEditorEl?.focusYamlEditor();
  }

  private async _save(): Promise<void> {
    await this._params!.saveConfig({
      ...this._params!.config,
      strategy: this._strategyConfig!,
    });
    showSaveSuccessToast(this, this.hass);
    this.closeDialog();
  }

  protected render() {
    if (!this._params || !this._strategyConfig) {
      return nothing;
    }

    const config = cleanLegacyStrategyConfig(this._strategyConfig);

    const title = this.hass.localize(
      "ui.panel.lovelace.editor.strategy-editor.header"
    );

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        @opened=${this._opened}
        .heading=${title || "-"}
      >
        <ha-dialog-header slot="heading">
          <ha-icon-button
            slot="navigationIcon"
            dialogAction="cancel"
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <span slot="title" .title=${title}>${title}</span>
          <ha-button-menu
            corner="BOTTOM_END"
            menuCorner="END"
            slot="actionItems"
            @closed=${stopPropagation}
            fixed
          >
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            ></ha-icon-button>
            <ha-list-item
              graphic="icon"
              @request-selected=${this._showRawConfigEditor}
            >
              ${this.hass.localize(
                "ui.panel.lovelace.editor.strategy-editor.raw_configuration_editor"
              )}
              <ha-svg-icon slot="graphic" .path=${mdiCodeBraces}></ha-svg-icon>
            </ha-list-item>
            <ha-list-item graphic="icon" @request-selected=${this._takeControl}>
              ${this.hass.localize(
                "ui.panel.lovelace.editor.strategy-editor.take_control"
              )}
              <ha-svg-icon
                slot="graphic"
                .path=${mdiAccountHardHat}
              ></ha-svg-icon>
            </ha-list-item>
          </ha-button-menu>
        </ha-dialog-header>
        <div class="content">
          <hui-dashboard-strategy-element-editor
            .hass=${this.hass}
            .lovelace=${this._params.config}
            .value=${config}
            @config-changed=${this._handleConfigChanged}
            @GUImode-changed=${this._handleGUIModeChanged}
            dialogInitialFocus
          ></hui-dashboard-strategy-element-editor>
        </div>

        <ha-button
          slot="secondaryAction"
          @click=${this._toggleMode}
          .disabled=${!this._guiModeAvailable}
          class="gui-mode-button"
        >
          ${this.hass!.localize(
            !this._strategyEditorEl || this._GUImode
              ? "ui.panel.lovelace.editor.strategy-editor.show_code_editor"
              : "ui.panel.lovelace.editor.strategy-editor.show_visual_editor"
          )}
        </ha-button>
        <ha-button @click=${this._save} slot="primaryAction">
          ${this.hass!.localize("ui.common.save")}
        </ha-button>
      </ha-dialog>
    `;
  }

  private _takeControl() {
    this._params!.takeControl();
    this.closeDialog();
  }

  private _showRawConfigEditor() {
    this._params!.showRawConfigEditor();
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --mdc-dialog-max-width: 800px;
          --dialog-content-padding: 0 24px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-dashboard-strategy-editor": DialogDashboardStrategyEditor;
  }
}
