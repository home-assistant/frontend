import {
  mdiAccountHardHat,
  mdiClose,
  mdiDotsVertical,
  mdiPlaylistEdit,
} from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import type { HASSDomEvent } from "../../../../../common/dom/fire_event";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../../common/dom/stop_propagation";
import "../../../../../components/ha-button";
import "../../../../../components/ha-button-menu";
import "../../../../../components/ha-dialog";
import "../../../../../components/ha-dialog-header";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-list-item";
import type { LovelaceStrategyConfig } from "../../../../../data/lovelace/config/strategy";
import { haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { showSaveSuccessToast } from "../../../../../util/toast-saved-success";
import { cleanLegacyStrategyConfig } from "../../../strategies/legacy-strategy";
import type { ConfigChangedEvent } from "../../hui-element-editor";
import type { GUIModeChangedEvent } from "../../types";
import "../hui-dashboard-strategy-element-editor";
import type { HuiDashboardStrategyElementEditor } from "../hui-dashboard-strategy-element-editor";
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

  private _handleAction(ev) {
    ev.stopPropagation();
    switch (ev.detail.index) {
      case 0:
        this._toggleMode();
        break;
      case 1:
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
          ${this._params.title
            ? html`<span slot="subtitle">${this._params.title}</span>`
            : nothing}
          <ha-button-menu
            corner="BOTTOM_END"
            menu-corner="END"
            slot="actionItems"
            @closed=${stopPropagation}
            fixed
            @action=${this._handleAction}
          >
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            ></ha-icon-button>
            <ha-list-item
              graphic="icon"
              .disabled=${!this._guiModeAvailable && !this._GUImode}
            >
              ${this.hass!.localize(
                `ui.panel.lovelace.editor.edit_view.edit_${!this._GUImode ? "ui" : "yaml"}`
              )}
              <ha-svg-icon
                slot="graphic"
                .path=${mdiPlaylistEdit}
              ></ha-svg-icon>
            </ha-list-item>
            <ha-list-item graphic="icon">
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

        <ha-button class="danger" @click=${this._delete} slot="secondaryAction">
          ${this.hass!.localize("ui.common.delete")}
        </ha-button>
        <ha-button @click=${this._cancel} slot="primaryAction">
          ${this.hass!.localize("ui.common.cancel")}
        </ha-button>
        <ha-button @click=${this._save} slot="primaryAction">
          ${this.hass!.localize("ui.common.save")}
        </ha-button>
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 0 24px;
          --dialog-surface-position: fixed;
          --dialog-surface-top: 40px;
          --mdc-dialog-min-width: min(600px, calc(100% - 32px));
          --mdc-dialog-max-width: calc(100% - 32px);
          --mdc-dialog-max-height: calc(100% - 80px);
        }

        @media all and (max-width: 450px), all and (max-height: 500px) {
          /* overrule the ha-style-dialog max-height on small screens */
          ha-dialog {
            height: 100%;
            --dialog-surface-top: 0px;
            --mdc-dialog-min-width: 100%;
            --mdc-dialog-max-width: 100%;
            --mdc-dialog-max-height: 100%;
            --dialog-content-padding: 8px;
          }
        }

        .danger {
          --mdc-theme-primary: var(--error-color);
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
