import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import type { HomeAssistant } from "../types";
import type { HaDeviceComboBoxDeviceFilterFunc } from "./device/ha-device-picker";
import "./ha-floor-picker";

@customElement("ha-floors-picker")
export class HaFloorsPicker extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property({ type: Array }) public value?: string[];

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ type: Boolean, attribute: "no-add" })
  public noAdd = false;

  /**
   * Show only floors with entities from specific domains.
   * @type {Array}
   * @attr include-domains
   */
  @property({ type: Array, attribute: "include-domains" })
  public includeDomains?: string[];

  /**
   * Show no floors with entities of these domains.
   * @type {Array}
   * @attr exclude-domains
   */
  @property({ type: Array, attribute: "exclude-domains" })
  public excludeDomains?: string[];

  /**
   * Show only floors with entities of these device classes.
   * @type {Array}
   * @attr include-device-classes
   */
  @property({ type: Array, attribute: "include-device-classes" })
  public includeDeviceClasses?: string[];

  @property({ attribute: false })
  public deviceFilter?: HaDeviceComboBoxDeviceFilterFunc;

  @property({ attribute: false })
  public entityFilter?: (entity: HassEntity) => boolean;

  @property({ attribute: "picked-floor-label" })
  public pickedFloorLabel?: string;

  @property({ attribute: "pick-floor-label" })
  public pickFloorLabel?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    const currentFloors = this._currentFloors;
    return html`
      ${currentFloors.map(
        (floor) => html`
          <div>
            <ha-floor-picker
              .curValue=${floor}
              .noAdd=${this.noAdd}
              .hass=${this.hass}
              .value=${floor}
              .label=${this.pickedFloorLabel}
              .includeDomains=${this.includeDomains}
              .excludeDomains=${this.excludeDomains}
              .includeDeviceClasses=${this.includeDeviceClasses}
              .deviceFilter=${this.deviceFilter}
              .entityFilter=${this.entityFilter}
              .disabled=${this.disabled}
              @value-changed=${this._floorChanged}
            ></ha-floor-picker>
          </div>
        `
      )}
      <div>
        <ha-floor-picker
          .noAdd=${this.noAdd}
          .hass=${this.hass}
          .label=${this.pickFloorLabel}
          .helper=${this.helper}
          .includeDomains=${this.includeDomains}
          .excludeDomains=${this.excludeDomains}
          .includeDeviceClasses=${this.includeDeviceClasses}
          .deviceFilter=${this.deviceFilter}
          .entityFilter=${this.entityFilter}
          .disabled=${this.disabled}
          .placeholder=${this.placeholder}
          .required=${this.required && !currentFloors.length}
          @value-changed=${this._addFloor}
          .excludeFloors=${currentFloors}
        ></ha-floor-picker>
      </div>
    `;
  }

  private get _currentFloors(): string[] {
    return this.value || [];
  }

  private async _updateFloors(floors) {
    this.value = floors;

    fireEvent(this, "value-changed", {
      value: floors,
    });
  }

  private _floorChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const curValue = (ev.currentTarget as any).curValue;
    const newValue = ev.detail.value;
    if (newValue === curValue) {
      return;
    }
    const currentFloors = this._currentFloors;
    if (!newValue || currentFloors.includes(newValue)) {
      this._updateFloors(currentFloors.filter((ent) => ent !== curValue));
      return;
    }
    this._updateFloors(
      currentFloors.map((ent) => (ent === curValue ? newValue : ent))
    );
  }

  private _addFloor(ev: CustomEvent) {
    ev.stopPropagation();

    const toAdd = ev.detail.value;
    if (!toAdd) {
      return;
    }
    (ev.currentTarget as any).value = "";
    const currentFloors = this._currentFloors;
    if (currentFloors.includes(toAdd)) {
      return;
    }

    this._updateFloors([...currentFloors, toAdd]);
  }

  static override styles = css`
    div {
      margin-top: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-floors-picker": HaFloorsPicker;
  }
}
