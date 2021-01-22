import {
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-dialog";
import {
  DeviceAction,
  DeviceCondition,
  DeviceTrigger,
  fetchDeviceActions,
  fetchDeviceConditions,
  fetchDeviceTriggers,
} from "../../../../data/device_automation";
import { haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import "./ha-device-actions-card";
import "./ha-device-conditions-card";
import "./ha-device-triggers-card";
import { DeviceAutomationDialogParams } from "./show-dialog-device-automation";
import "@material/mwc-button/mwc-button";

@customElement("dialog-device-automation")
export class DialogDeviceAutomation extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _triggers: DeviceTrigger[] = [];

  @internalProperty() private _conditions: DeviceCondition[] = [];

  @internalProperty() private _actions: DeviceAction[] = [];

  @internalProperty() private _params?: DeviceAutomationDialogParams;

  public async showDialog(params: DeviceAutomationDialogParams): Promise<void> {
    this._params = params;
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this.hass.loadBackendTranslation("device_automation");
  }

  protected updated(changedProps): void {
    super.updated(changedProps);

    if (!changedProps.has("_params")) {
      return;
    }

    this._triggers = [];
    this._conditions = [];
    this._actions = [];

    if (!this._params) {
      return;
    }

    const { deviceId, script } = this._params;

    fetchDeviceActions(this.hass, deviceId).then((actions) => {
      this._actions = actions;
    });
    if (script) {
      return;
    }
    fetchDeviceTriggers(this.hass, deviceId).then((triggers) => {
      this._triggers = triggers;
    });
    fetchDeviceConditions(this.hass, deviceId).then((conditions) => {
      this._conditions = conditions;
    });
  }

  protected render(): TemplateResult | void {
    if (!this._params) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${this.hass.localize(
          `ui.panel.config.devices.${
            this._params.script ? "script" : "automation"
          }.create`
        )}
      >
        <div @chip-clicked=${this.closeDialog}>
          ${this._triggers.length ||
          this._conditions.length ||
          this._actions.length
            ? html`
                ${this._triggers.length
                  ? html`
                      <ha-device-triggers-card
                        .hass=${this.hass}
                        .automations=${this._triggers}
                      ></ha-device-triggers-card>
                    `
                  : ""}
                ${this._conditions.length
                  ? html`
                      <ha-device-conditions-card
                        .hass=${this.hass}
                        .automations=${this._conditions}
                      ></ha-device-conditions-card>
                    `
                  : ""}
                ${this._actions.length
                  ? html`
                      <ha-device-actions-card
                        .hass=${this.hass}
                        .automations=${this._actions}
                        .script=${this._params.script}
                      ></ha-device-actions-card>
                    `
                  : ""}
              `
            : this.hass.localize(
                "ui.panel.config.devices.automation.no_device_automations"
              )}
        </div>
        <mwc-button slot="primaryAction" @click=${this.closeDialog}>
          ${this.hass.localize("ui.common.close")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  static get styles(): CSSResult {
    return haStyleDialog;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-device-automation": DialogDeviceAutomation;
  }
}
