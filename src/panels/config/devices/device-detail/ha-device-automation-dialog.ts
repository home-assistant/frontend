import {
  LitElement,
  html,
  css,
  CSSResult,
  TemplateResult,
  property,
  customElement,
} from "lit-element";

import "../../../../components/ha-dialog";
import "./ha-device-triggers-card";
import "./ha-device-conditions-card";
import "./ha-device-actions-card";
import { DeviceAutomationDialogParams } from "./show-dialog-device-automation";
import { HomeAssistant } from "../../../../types";
import {
  DeviceTrigger,
  DeviceCondition,
  DeviceAction,
  fetchDeviceTriggers,
  fetchDeviceConditions,
  fetchDeviceActions,
} from "../../../../data/device_automation";

@customElement("dialog-device-automation")
export class DialogDeviceAutomation extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() private _triggers: DeviceTrigger[] = [];
  @property() private _conditions: DeviceCondition[] = [];
  @property() private _actions: DeviceAction[] = [];
  @property() private _params?: DeviceAutomationDialogParams;

  public async showDialog(params: DeviceAutomationDialogParams): Promise<void> {
    this._params = params;
    await this.updateComplete;
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

    fetchDeviceActions(this.hass, deviceId).then(
      (actions) => (this._actions = actions)
    );
    if (script) {
      return;
    }
    fetchDeviceTriggers(this.hass, deviceId).then(
      (triggers) => (this._triggers = triggers)
    );
    fetchDeviceConditions(this.hass, deviceId).then(
      (conditions) => (this._conditions = conditions)
    );
  }

  protected render(): TemplateResult | void {
    if (!this._params) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        @closing="${this._close}"
        .heading=${this.hass.localize(
          `ui.panel.config.devices.${
            this._params.script ? "script" : "automation"
          }.create`
        )}
      >
        <div @chip-clicked=${this._close}>
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
        <mwc-button slot="primaryAction" @click="${this._close}">
          Close
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _close(): void {
    this._params = undefined;
  }

  static get styles(): CSSResult {
    return css`
      ha-dialog {
        --mdc-dialog-title-ink-color: var(--primary-text-color);
      }
      @media only screen and (min-width: 600px) {
        ha-dialog {
          --mdc-dialog-min-width: 600px;
        }
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-device-automation": DialogDeviceAutomation;
  }
}
