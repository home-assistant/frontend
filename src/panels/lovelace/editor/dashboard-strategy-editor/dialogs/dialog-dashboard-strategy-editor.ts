import { mdiAccountHardHat, mdiDotsVertical, mdiPlaylistEdit } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import type { HASSDomEvent } from "../../../../../common/dom/fire_event";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-button";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-dialog";
import "../../../../../components/ha-dropdown";
import "../../../../../components/ha-dropdown-item";
import "../../../../../components/ha-icon-button";
import type { LovelaceStrategyConfig } from "../../../../../data/lovelace/config/strategy";
import {
  haStyleDialog,
  haStyleDialogFixedTop,
} from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { showSaveSuccessToast } from "../../../../../util/toast-saved-success";
import { cleanLegacyStrategyConfig } from "../../../strategies/legacy-strategy";
import type { ConfigChangedEvent } from "../../hui-element-editor";
import type { GUIModeChangedEvent } from "../../types";
import "../hui-dashboard-strategy-element-editor";
import type { HuiDashboardStrategyElementEditor } from "../hui-dashboard-strategy-element-editor";
import type { DashboardStrategyEditorDialogParams } from "./show-dialog-dashboard-strategy-editor";
import type { HaDropdownSelectEvent } from "../../../../../components/ha-dropdown";

@customElement("dialog-dashboard-strategy-editor")
class DialogDashboardStrategyEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: DashboardStrategyEditorDialogParams;

  @state() private _strategyConfig?: LovelaceStrategyConfig;

  @state() private _GUImode = true;

  @state() private _guiModeAvailable? = true;

  @state() private _open = false;

  @query("hui-dashboard-strategy-element-editor")
  private _strategyEditorEl?: HuiDashboardStrategyElementEditor;

  public async showDialog(
    params: DashboardStrategyEditorDialogParams
  ): Promise<void> {
    this._params = params;
    this._strategyConfig = params.config.strategy;
    this._open = true;
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._strategyConfig = undefined;
    this._guiModeAvailable = true;
    this._GUImode = true;
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

  private async _save(): Promise<void> {
    await this._params!.saveConfig({
      ...this._params!.config,
      strategy: this._strategyConfig!,
    });
    showSaveSuccessToast(this, this.hass);
    this.closeDialog();
  }

  private async _delete(ev) {
    ev.stopPropagation();
    if (await this._params!.deleteDashboard()) {
      this.closeDialog();
    }
  }

  private _cancel(ev): void {
    ev.stopPropagation();
    this.closeDialog();
  }

  private _handleAction(ev: HaDropdownSelectEvent) {
    const action = ev.detail.item.value;

    if (!action) {
      return;
    }

    switch (action) {
      case "toggle-mode":
        this._toggleMode();
        break;
      case "take-control":
        this._takeControl();
        break;
    }
  }

  private _toggleMode(): void {
    this._strategyEditorEl?.toggleMode();
  }

  private _takeControl() {
    this._params!.takeControl();
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
        .hass=${this.hass}
        .open=${this._open}
        header-title=${title || "-"}
        header-subtitle=${ifDefined(this._params.title)}
        width="large"
        @closed=${this._dialogClosed}
      >
        <ha-dropdown
          placement="bottom-end"
          slot="headerActionItems"
          @wa-select=${this._handleAction}
        >
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          <ha-dropdown-item
            value="toggle-mode"
            .disabled=${!this._guiModeAvailable && !this._GUImode}
          >
            ${this.hass!.localize(
              `ui.panel.lovelace.editor.edit_view.edit_${!this._GUImode ? "ui" : "yaml"}`
            )}
            <ha-svg-icon slot="icon" .path=${mdiPlaylistEdit}></ha-svg-icon>
          </ha-dropdown-item>
          <ha-dropdown-item value="take-control">
            ${this.hass.localize(
              "ui.panel.lovelace.editor.strategy-editor.take_control"
            )}
            <ha-svg-icon slot="icon" .path=${mdiAccountHardHat}></ha-svg-icon>
          </ha-dropdown-item>
        </ha-dropdown>
        <div class="content">
          <hui-dashboard-strategy-element-editor
            .hass=${this.hass}
            .lovelace=${this._params.config}
            .value=${config}
            @config-changed=${this._handleConfigChanged}
            @GUImode-changed=${this._handleGUIModeChanged}
            autofocus
          ></hui-dashboard-strategy-element-editor>
        </div>

        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            variant="danger"
            appearance="plain"
            @click=${this._delete}
          >
            ${this.hass!.localize("ui.common.delete")}
          </ha-button>
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this._cancel}
          >
            ${this.hass!.localize("ui.common.cancel")}
          </ha-button>
          <ha-button slot="primaryAction" @click=${this._save}>
            ${this.hass!.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      haStyleDialogFixedTop,
      css`
        ha-dialog {
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
