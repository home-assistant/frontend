import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import { createCloseHeading } from "../../../../components/ha-dialog";
import "../../../../components/ha-form/ha-form";
import { LovelaceStrategyConfig } from "../../../../data/lovelace/config/strategy";
import { haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import "../../../lovelace/editor/dashboard-strategy-editor/hui-dashboard-strategy-element-editor";
import { LovelaceDashboardConfigureStrategyDialogParams } from "./show-dialog-lovelace-dashboard-configure-strategy";

@customElement("dialog-lovelace-dashboard-configure-strategy")
export class DialogLovelaceDashboardDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: LovelaceDashboardConfigureStrategyDialogParams;

  @state() private _submitting = false;

  @state() private _data?: LovelaceStrategyConfig;

  public showDialog(
    params: LovelaceDashboardConfigureStrategyDialogParams
  ): void {
    this._params = params;
    this._data = params.config.strategy;
  }

  public closeDialog(): void {
    this._params = undefined;
    this._data = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params || !this._data) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize(
            "ui.panel.config.lovelace.dashboards.detail.new_dashboard"
          )
        )}
      >
        <div>
          <hui-dashboard-strategy-element-editor
            .hass=${this.hass}
            .lovelace=${this._params.config}
            .value=${this._data}
            @config-changed=${this._handleConfigChanged}
            dialogInitialFocus
          ></hui-dashboard-strategy-element-editor>
        </div>

        <ha-button
          slot="primaryAction"
          @click=${this._save}
          .disabled=${this._submitting}
        >
          ${this.hass.localize("ui.common.next")}
        </ha-button>
      </ha-dialog>
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
    "dialog-lovelace-dashboard-configure-strategy": DialogLovelaceDashboardDetail;
  }
}
