import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent, HASSDomEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import { createCloseHeading } from "../../../../components/ha-dialog";
import { LovelaceStrategyConfig } from "../../../../data/lovelace/config/strategy";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
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

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(this.hass, "Edit dashboard")}
        @opened=${this._opened}
      >
        <hui-dashboard-strategy-element-editor
          .hass=${this.hass}
          .lovelace=${this._params.config}
          .value=${config}
          @config-changed=${this._handleConfigChanged}
          @GUImode-changed=${this._handleGUIModeChanged}
          dialogInitialFocus
        ></hui-dashboard-strategy-element-editor>
        ${this._strategyConfig !== undefined
          ? html`
              <ha-button
                slot="secondaryAction"
                @click=${this._toggleMode}
                .disabled=${!this._guiModeAvailable}
                class="gui-mode-button"
              >
                ${this.hass!.localize(
                  !this._strategyEditorEl || this._GUImode
                    ? "ui.panel.lovelace.editor.edit_card.show_code_editor"
                    : "ui.panel.lovelace.editor.edit_card.show_visual_editor"
                )}
              </ha-button>
              <ha-button @click=${this._save} slot="primaryAction">
                ${this.hass!.localize("ui.common.save")}
              </ha-button>
            `
          : nothing}
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [haStyle, haStyleDialog, css``];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-dashboard-strategy-editor": DialogDashboardStrategyEditor;
  }
}
