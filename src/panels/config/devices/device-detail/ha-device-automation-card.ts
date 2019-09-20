import { LitElement, TemplateResult, html, property } from "lit-element";
import { HomeAssistant } from "../../../../types";
import { DeviceAutomation } from "../../../../data/device_automation";

import "../../../../components/ha-card";
import "../../../../components/ha-chips";
import { showAutomationEditor } from "../../../../data/automation";

export abstract class HaDeviceAutomationCard<
  T extends DeviceAutomation
> extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public deviceId?: string;

  protected headerKey = "";
  protected type = "";

  @property() private _automations: T[] = [];

  private _localizeDeviceAutomation: (
    hass: HomeAssistant,
    automation: T
  ) => string;
  private _fetchDeviceAutomations: (
    hass: HomeAssistant,
    deviceId: string
  ) => Promise<T[]>;

  constructor(
    localizeDeviceAutomation: HaDeviceAutomationCard<
      T
    >["_localizeDeviceAutomation"],
    fetchDeviceAutomations: HaDeviceAutomationCard<T>["_fetchDeviceAutomations"]
  ) {
    super();
    this._localizeDeviceAutomation = localizeDeviceAutomation;
    this._fetchDeviceAutomations = fetchDeviceAutomations;
  }

  protected shouldUpdate(changedProps): boolean {
    if (changedProps.has("deviceId") || changedProps.has("_automations")) {
      return true;
    }
    const oldHass = changedProps.get("hass");
    if (!oldHass || this.hass.language !== oldHass.language) {
      return true;
    }
    return false;
  }

  protected async updated(changedProps): Promise<void> {
    super.updated(changedProps);

    if (changedProps.has("deviceId")) {
      this._automations = this.deviceId
        ? await this._fetchDeviceAutomations(this.hass, this.deviceId)
        : [];
    }
  }

  protected render(): TemplateResult {
    if (this._automations.length === 0) {
      return html``;
    }
    return html`
      <ha-card>
        <div class="card-header">
          ${this.hass.localize(this.headerKey)}
        </div>
        <div class="card-content">
          <ha-chips
            @chip-clicked=${this._handleAutomationClicked}
            .items=${this._automations.map((automation) =>
              this._localizeDeviceAutomation(this.hass, automation)
            )}
          >
          </ha-chips>
        </div>
      </ha-card>
    `;
  }

  private _handleAutomationClicked(ev: CustomEvent) {
    const automation = this._automations[ev.detail.index];
    if (!automation) {
      return;
    }
    const data = {};
    data[this.type] = [automation];
    showAutomationEditor(this, data);
  }
}
