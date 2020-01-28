import { LitElement, TemplateResult, html, property } from "lit-element";
import { HomeAssistant } from "../../../../types";
import { DeviceAutomation } from "../../../../data/device_automation";

import "../../../../components/ha-card";
import "../../../../components/ha-chips";
import { showAutomationEditor } from "../../../../data/automation";
import { showScriptEditor } from "../../../../data/script";

export abstract class HaDeviceAutomationCard<
  T extends DeviceAutomation
> extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public deviceId?: string;
  @property() public script = false;
  @property() public automations: T[] = [];

  protected headerKey = "";
  protected type = "";

  private _localizeDeviceAutomation: (
    hass: HomeAssistant,
    automation: T
  ) => string;

  constructor(
    localizeDeviceAutomation: HaDeviceAutomationCard<
      T
    >["_localizeDeviceAutomation"]
  ) {
    super();
    this._localizeDeviceAutomation = localizeDeviceAutomation;
  }

  protected shouldUpdate(changedProps): boolean {
    if (changedProps.has("deviceId") || changedProps.has("automations")) {
      return true;
    }
    const oldHass = changedProps.get("hass");
    if (!oldHass || this.hass.language !== oldHass.language) {
      return true;
    }
    return false;
  }

  protected render(): TemplateResult {
    if (this.automations.length === 0) {
      return html``;
    }
    return html`
      <h3>
        ${this.hass.localize(this.headerKey)}
      </h3>
      <div class="content">
        <ha-chips
          @chip-clicked=${this._handleAutomationClicked}
          .items=${this.automations.map((automation) =>
            this._localizeDeviceAutomation(this.hass, automation)
          )}
        >
        </ha-chips>
      </div>
    `;
  }

  private _handleAutomationClicked(ev: CustomEvent) {
    const automation = this.automations[ev.detail.index];
    if (!automation) {
      return;
    }
    if (this.script) {
      showScriptEditor(this, { sequence: [automation] });
      return;
    }
    const data = {};
    data[this.type] = [automation];
    showAutomationEditor(this, data);
  }
}
