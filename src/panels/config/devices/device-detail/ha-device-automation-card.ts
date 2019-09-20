import {
  LitElement,
  TemplateResult,
  html,
  css,
  CSSResult,
  property,
} from "lit-element";
import { HomeAssistant } from "../../../../types";
import { DeviceAutomation } from "../../../../data/device_automation";

export abstract class HaDeviceAutomationCard<
  T extends DeviceAutomation
> extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public deviceId?: string;
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
    if (!this.hass || this._automations.length === 0) {
      return html``;
    }
    return html`
      <ha-card>
        <div class="card-content">
          <ha-chips
            .items=${this._automations.map((automation) =>
              this._localizeDeviceAutomation(this.hass, automation)
            )}
          >
          </ha-chips>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResult {
    return css``;
  }
}
