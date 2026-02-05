import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-wa-dialog";
import type { LovelaceStrategyConfig } from "../../../../data/lovelace/config/strategy";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "../../../lovelace/editor/dashboard-strategy-editor/hui-dashboard-strategy-element-editor";
import type { LovelaceDashboardConfigureStrategyDialogParams } from "./show-dialog-lovelace-dashboard-configure-strategy";

@customElement("dialog-lovelace-dashboard-configure-strategy")
export class DialogLovelaceDashboardConfigureStrategy extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: LovelaceDashboardConfigureStrategyDialogParams;

  @state() private _open = false;

  @state() private _submitting = false;

  @state() private _data?: LovelaceStrategyConfig;

  public showDialog(
    params: LovelaceDashboardConfigureStrategyDialogParams
  ): void {
    this._params = params;
    this._data = params.config.strategy;
    this._open = true;
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._data = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params || !this._data) {
      return nothing;
    }

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.lovelace.dashboards.detail.new_dashboard"
        )}
        @closed=${this._dialogClosed}
      >
        <div>
          <hui-dashboard-strategy-element-editor
            .hass=${this.hass}
            .lovelace=${this._params.config}
            .value=${this._data}
            @config-changed=${this._handleConfigChanged}
            autofocus
          ></hui-dashboard-strategy-element-editor>
        </div>

        <ha-dialog-footer slot="footer">
          <ha-button
            slot="primaryAction"
            @click=${this._save}
            .disabled=${this._submitting}
          >
            ${this.hass.localize("ui.common.next")}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  private _handleConfigChanged(ev: CustomEvent): void {
    this._data = ev.detail.config;
  }

  private async _save() {
    if (!this._data) {
      return;
    }
    this._submitting = true;
    await this._params!.saveConfig({
      ...this._params!.config,
      strategy: this._data,
    });
    this._submitting = false;
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [haStyleDialog, css``];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-lovelace-dashboard-configure-strategy": DialogLovelaceDashboardConfigureStrategy;
  }
}
