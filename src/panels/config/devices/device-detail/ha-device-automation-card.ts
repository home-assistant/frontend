import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { property } from "lit/decorators";
import "../../../../components/ha-card";
import "../../../../components/ha-chip-set";
import { showAutomationEditor } from "../../../../data/automation";
import {
  DeviceAction,
  DeviceAutomation,
} from "../../../../data/device_automation";
import { showScriptEditor } from "../../../../data/script";
import { HomeAssistant } from "../../../../types";

export abstract class HaDeviceAutomationCard<
  T extends DeviceAutomation
> extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

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
    localizeDeviceAutomation: HaDeviceAutomationCard<T>["_localizeDeviceAutomation"]
  ) {
    super();
    this._localizeDeviceAutomation = localizeDeviceAutomation;
  }

  protected shouldUpdate(changedProps): boolean {
    if (changedProps.has("deviceId") || changedProps.has("automations")) {
      return true;
    }
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (!oldHass || oldHass.language !== this.hass.language) {
      return true;
    }
    return false;
  }

  protected render(): TemplateResult {
    if (this.automations.length === 0) {
      return html``;
    }
    return html`
      <h3>${this.hass.localize(this.headerKey)}</h3>
      <div class="content">
        <ha-chip-set
          @chip-clicked=${this._handleAutomationClicked}
          .items=${this.automations.map((automation) =>
            this._localizeDeviceAutomation(this.hass, automation)
          )}
        >
        </ha-chip-set>
      </div>
    `;
  }

  private _handleAutomationClicked(ev: CustomEvent) {
    const automation = this.automations[ev.detail.index];
    if (!automation) {
      return;
    }
    if (this.script) {
      showScriptEditor({ sequence: [automation as DeviceAction] });
      return;
    }
    const data = {};
    data[this.type] = [automation];
    showAutomationEditor(data);
  }

  static get styles(): CSSResultGroup {
    return css`
      h3 {
        color: var(--primary-text-color);
      }
    `;
  }
}
