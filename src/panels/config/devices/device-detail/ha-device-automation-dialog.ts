import {
  mdiAbTesting,
  mdiGestureTap,
  mdiPencilOutline,
  mdiRoomService,
} from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { shouldHandleRequestSelectedEvent } from "../../../../common/mwc/handle-request-selected-event";
import { createCloseHeading } from "../../../../components/ha-dialog";
import "../../../../components/ha-icon-next";
import "../../../../components/ha-list-item";
import "../../../../components/ha-list";
import type { AutomationConfig } from "../../../../data/automation";
import { showAutomationEditor } from "../../../../data/automation";
import type {
  DeviceAction,
  DeviceCondition,
  DeviceTrigger,
} from "../../../../data/device_automation";
import {
  fetchDeviceActions,
  fetchDeviceConditions,
  fetchDeviceTriggers,
  sortDeviceAutomations,
} from "../../../../data/device_automation";
import type { ScriptConfig } from "../../../../data/script";
import { showScriptEditor } from "../../../../data/script";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { DeviceAutomationDialogParams } from "./show-dialog-device-automation";

@customElement("dialog-device-automation")
export class DialogDeviceAutomation extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _triggers: DeviceTrigger[] = [];

  @state() private _conditions: DeviceCondition[] = [];

  @state() private _actions: DeviceAction[] = [];

  @state() private _params?: DeviceAutomationDialogParams;

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

    const { device, script } = this._params;

    fetchDeviceActions(this.hass, device.id).then((actions) => {
      this._actions = actions.sort(sortDeviceAutomations);
    });
    if (script) {
      return;
    }
    fetchDeviceTriggers(this.hass, device.id).then((triggers) => {
      this._triggers = triggers.sort(sortDeviceAutomations);
    });
    fetchDeviceConditions(this.hass, device.id).then((conditions) => {
      this._conditions = conditions.sort(sortDeviceAutomations);
    });
  }

  private _handleRowClick = (ev) => {
    if (!shouldHandleRequestSelectedEvent(ev) || !this._params) {
      return;
    }
    const type = (ev.currentTarget as any).type;
    const isScript = this._params.script;

    this.closeDialog();

    if (isScript) {
      const newScript = {} as ScriptConfig;
      if (type === "action") {
        newScript.sequence = [this._actions[0]];
      }
      showScriptEditor(newScript, true);
    } else {
      const newAutomation = {} as AutomationConfig;
      if (type === "trigger") {
        newAutomation.triggers = [this._triggers[0]];
      }
      if (type === "condition") {
        newAutomation.conditions = [this._conditions[0]];
      }
      if (type === "action") {
        newAutomation.actions = [this._actions[0]];
      }
      showAutomationEditor(newAutomation, true);
    }
  };

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const mode = this._params.script ? "script" : "automation";

    const title = this.hass.localize(`ui.panel.config.devices.${mode}.create`, {
      type: this.hass.localize(
        `ui.panel.config.devices.type.${
          this._params.device.entry_type || "device"
        }`
      ),
    });

    return html`
      <ha-dialog
        open
        hideActions
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(this.hass, title)}
      >
        <ha-list
          innerRole="listbox"
          itemRoles="option"
          innerAriaLabel="Create new automation"
          rootTabbable
          dialogInitialFocus
        >
          ${this._triggers.length
            ? html`
                <ha-list-item
                  hasmeta
                  twoline
                  graphic="icon"
                  .type=${"trigger"}
                  @request-selected=${this._handleRowClick}
                >
                  <ha-svg-icon
                    slot="graphic"
                    .path=${mdiGestureTap}
                  ></ha-svg-icon>
                  ${this.hass.localize(
                    `ui.panel.config.devices.automation.triggers.title`
                  )}
                  <span slot="secondary">
                    ${this.hass.localize(
                      `ui.panel.config.devices.automation.triggers.description`
                    )}
                  </span>
                  <ha-icon-next slot="meta"></ha-icon-next>
                </ha-list-item>
              `
            : nothing}
          ${this._conditions.length
            ? html`
                <ha-list-item
                  hasmeta
                  twoline
                  graphic="icon"
                  .type=${"condition"}
                  @request-selected=${this._handleRowClick}
                >
                  <ha-svg-icon
                    slot="graphic"
                    .path=${mdiAbTesting}
                  ></ha-svg-icon>
                  ${this.hass.localize(
                    `ui.panel.config.devices.automation.conditions.title`
                  )}
                  <span slot="secondary">
                    ${this.hass.localize(
                      `ui.panel.config.devices.automation.conditions.description`
                    )}
                  </span>
                  <ha-icon-next slot="meta"></ha-icon-next>
                </ha-list-item>
              `
            : nothing}
          ${this._actions.length
            ? html`
                <ha-list-item
                  hasmeta
                  twoline
                  graphic="icon"
                  .type=${"action"}
                  @request-selected=${this._handleRowClick}
                >
                  <ha-svg-icon
                    slot="graphic"
                    .path=${mdiRoomService}
                  ></ha-svg-icon>
                  ${this.hass.localize(
                    `ui.panel.config.devices.${mode}.actions.title`
                  )}
                  <span slot="secondary">
                    ${this.hass.localize(
                      `ui.panel.config.devices.${mode}.actions.description`
                    )}
                  </span>
                  <ha-icon-next slot="meta"></ha-icon-next>
                </ha-list-item>
              `
            : nothing}
          ${this._triggers.length ||
          this._conditions.length ||
          this._actions.length
            ? html`<li divider role="separator"></li>`
            : nothing}
          <ha-list-item
            hasmeta
            twoline
            graphic="icon"
            @request-selected=${this._handleRowClick}
          >
            <ha-svg-icon slot="graphic" .path=${mdiPencilOutline}></ha-svg-icon>
            ${this.hass.localize(`ui.panel.config.devices.${mode}.new.title`)}
            <span slot="secondary">
              ${this.hass.localize(
                `ui.panel.config.devices.${mode}.new.description`
              )}
            </span>
            <ha-icon-next slot="meta"></ha-icon-next>
          </ha-list-item>
        </ha-list>
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 0;
          --mdc-dialog-max-height: 60vh;
        }
        @media all and (min-width: 550px) {
          ha-dialog {
            --mdc-dialog-min-width: 500px;
          }
        }
        ha-icon-next {
          width: 24px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-device-automation": DialogDeviceAutomation;
  }
}
