import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-listbox/paper-listbox";
import {
  LitElement,
  TemplateResult,
  html,
  css,
  CSSResult,
  property,
} from "lit-element";
import { HomeAssistant } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";
import {
  DeviceAutomation,
  deviceAutomationsEqual,
} from "../../data/device_automation";
import "../../components/ha-paper-dropdown-menu";

const NO_AUTOMATION_KEY = "NO_AUTOMATION";
const UNKNOWN_AUTOMATION_KEY = "UNKNOWN_AUTOMATION";

export abstract class HaDeviceAutomationPicker<
  T extends DeviceAutomation
> extends LitElement {
  public hass!: HomeAssistant;
  @property() public label?: string;
  @property() public deviceId?: string;
  @property() public value?: T;
  protected NO_AUTOMATION_TEXT = "No automations";
  protected UNKNOWN_AUTOMATION_TEXT = "Unknown automation";
  @property() private _automations: T[] = [];

  // Trigger an empty render so we start with a clean DOM.
  // paper-listbox does not like changing things around.
  @property() private _renderEmpty = false;

  private get _key() {
    if (!this.value || deviceAutomationsEqual(this._noAutomation, this.value)) {
      return NO_AUTOMATION_KEY;
    }

    const idx = this._automations.findIndex((automation) =>
      // deviceAutomationsEqual/*<T>*/(automation, this.value!)
      deviceAutomationsEqual(automation, this.value!)
    );

    if (idx === -1) {
      return UNKNOWN_AUTOMATION_KEY;
    }

    return `${this._automations[idx].device_id}_${idx}`;
  }

  protected localizeDeviceAutomation(value) {
    /**/
  }

  protected render(): TemplateResult | void {
    if (this._renderEmpty) {
      return html``;
    }
    return html`
      <ha-paper-dropdown-menu
        .label=${this.label}
        .value=${this.value ? this.localizeDeviceAutomation(this.value) : ""}
        ?disabled=${this._automations.length === 0}
      >
        <paper-listbox
          slot="dropdown-content"
          .selected=${this._key}
          attr-for-selected="key"
          @iron-select=${this._automationChanged}
        >
          <paper-item
            key=${NO_AUTOMATION_KEY}
            .automation=${this._noAutomation}
            hidden
          >
            ${this.NO_AUTOMATION_TEXT}
          </paper-item>
          <paper-item
            key=${UNKNOWN_AUTOMATION_KEY}
            .automation=${this.value}
            hidden
          >
            ${this.UNKNOWN_AUTOMATION_TEXT}
          </paper-item>
          ${this._automations.map(
            (automation, idx) => html`
              <paper-item
                key=${`${this.deviceId}_${idx}`}
                .automation=${automation}
              >
                ${this.localizeDeviceAutomation(automation)}
              </paper-item>
            `
          )}
        </paper-listbox>
      </ha-paper-dropdown-menu>
    `;
  }

  protected updated(changedProps) {
    super.updated(changedProps);

    if (changedProps.has("deviceId")) {
      this._updateDeviceInfo();
    }

    // The value has changed, force the listbox to update
    if (changedProps.has("value") || changedProps.has("_renderEmpty")) {
      const listbox = this.shadowRoot!.querySelector("paper-listbox")!;
      if (listbox) {
        listbox._selectSelected(this._key);
      }
    }
  }

  protected async _fetchDeviceAutomations() {
    /**/
  }

  private async _updateDeviceInfo() {
    this._automations = this.deviceId
      ? await this._fetchDeviceAutomations()
      : // No device, clear the list of automations
        [];

    // If there is no value, or if we have changed the device ID, reset the value.
    if (!this.value || this.value.device_id !== this.deviceId) {
      this._setValue(
        this._automations.length ? this._automations[0] : this._noAutomation
      );
    }
    this._renderEmpty = true;
    await this.updateComplete;
    this._renderEmpty = false;
  }

  protected get _noAutomation(): T {
    /**/
  }

  private _automationChanged(ev) {
    this._setValue(ev.detail.item.automation);
  }

  private _setValue(automation: T) {
    if (this.value && deviceAutomationsEqual(automation, this.value)) {
      return;
    }
    this.value = automation;
    setTimeout(() => {
      fireEvent(this, "change");
    }, 0);
  }

  static get styles(): CSSResult {
    return css`
      ha-paper-dropdown-menu {
        width: 100%;
      }
      paper-listbox {
        min-width: 200px;
      }
      paper-item {
        cursor: pointer;
      }
    `;
  }
}
