import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import type { HomeAssistant } from "../types";
import type { HaDevicePickerDeviceFilterFunc } from "./device/ha-device-picker";
import "./ha-label-picker";

@customElement("ha-labels-picker")
export class HaLabelsPicker extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public value?: string[];

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ type: Boolean, attribute: "no-add" })
  public noAdd?: boolean;

  /**
   * Show only labels with entities from specific domains.
   * @type {Array}
   * @attr include-domains
   */
  @property({ type: Array, attribute: "include-domains" })
  public includeDomains?: string[];

  /**
   * Show no label with entities of these domains.
   * @type {Array}
   * @attr exclude-domains
   */
  @property({ type: Array, attribute: "exclude-domains" })
  public excludeDomains?: string[];

  /**
   * Show only label with entities of these device classes.
   * @type {Array}
   * @attr include-device-classes
   */
  @property({ type: Array, attribute: "include-device-classes" })
  public includeDeviceClasses?: string[];

  @property() public deviceFilter?: HaDevicePickerDeviceFilterFunc;

  @property() public entityFilter?: (entity: HassEntity) => boolean;

  @property({ attribute: "picked-label-label" })
  public pickedLabelLabel?: string;

  @property({ attribute: "pick-label-label" })
  public pickLabelLabel?: string;

  @property({ type: Boolean }) public disabled?: boolean;

  @property({ type: Boolean }) public required?: boolean;

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    const currentLabels = this._currentLabels;
    return html`
      ${currentLabels.map(
        (label) => html`
          <div>
            <ha-label-picker
              .curValue=${label}
              .noAdd=${this.noAdd}
              .hass=${this.hass}
              .value=${label}
              .label=${this.pickedLabelLabel}
              .includeDomains=${this.includeDomains}
              .excludeDomains=${this.excludeDomains}
              .includeDeviceClasses=${this.includeDeviceClasses}
              .deviceFilter=${this.deviceFilter}
              .entityFilter=${this.entityFilter}
              .disabled=${this.disabled}
              @value-changed=${this._labelChanged}
            ></ha-label-picker>
          </div>
        `
      )}
      <div>
        <ha-label-picker
          .noAdd=${this.noAdd}
          .hass=${this.hass}
          .label=${this.pickLabelLabel}
          .helper=${this.helper}
          .includeDomains=${this.includeDomains}
          .excludeDomains=${this.excludeDomains}
          .includeDeviceClasses=${this.includeDeviceClasses}
          .deviceFilter=${this.deviceFilter}
          .entityFilter=${this.entityFilter}
          .disabled=${this.disabled}
          .placeholder=${this.placeholder}
          .required=${this.required && !currentLabels.length}
          @value-changed=${this._addLabel}
        ></ha-label-picker>
      </div>
    `;
  }

  private get _currentLabels(): string[] {
    return this.value || [];
  }

  private async _updateLabels(labels) {
    this.value = labels;

    fireEvent(this, "value-changed", {
      value: labels,
    });
  }

  private _labelChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const curValue = (ev.currentTarget as any).curValue;
    const newValue = ev.detail.value;
    if (newValue === curValue) {
      return;
    }
    const currentLabels = this._currentLabels;
    if (!newValue || currentLabels.includes(newValue)) {
      this._updateLabels(currentLabels.filter((ent) => ent !== curValue));
      return;
    }
    this._updateLabels(
      currentLabels.map((ent) => (ent === curValue ? newValue : ent))
    );
  }

  private _addLabel(ev: CustomEvent) {
    ev.stopPropagation();

    const toAdd = ev.detail.value;
    if (!toAdd) {
      return;
    }
    (ev.currentTarget as any).value = "";
    const currentLabels = this._currentLabels;
    if (currentLabels.includes(toAdd)) {
      return;
    }

    this._updateLabels([...currentLabels, toAdd]);
  }

  static override styles = css`
    div {
      margin-top: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-labels-picker": HaLabelsPicker;
  }
}
