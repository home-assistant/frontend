import { mdiDragHorizontalVariant } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import type { HomeAssistant } from "../types";
import type { HaDevicePickerDeviceFilterFunc } from "./device/ha-device-picker";
import "./ha-area-picker";
import "./ha-sortable";

@customElement("ha-areas-picker")
export class HaAreasPicker extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property({ type: Array }) public value?: string[];

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ type: Boolean, attribute: "no-add" })
  public noAdd = false;

  /**
   * Show only areas with entities from specific domains.
   * @type {Array}
   * @attr include-domains
   */
  @property({ type: Array, attribute: "include-domains" })
  public includeDomains?: string[];

  /**
   * Show no areas with entities of these domains.
   * @type {Array}
   * @attr exclude-domains
   */
  @property({ type: Array, attribute: "exclude-domains" })
  public excludeDomains?: string[];

  /**
   * Show only areas with entities of these device classes.
   * @type {Array}
   * @attr include-device-classes
   */
  @property({ type: Array, attribute: "include-device-classes" })
  public includeDeviceClasses?: string[];

  @property({ attribute: false })
  public deviceFilter?: HaDevicePickerDeviceFilterFunc;

  @property({ attribute: false })
  public entityFilter?: (entity: HassEntity) => boolean;

  @property({ attribute: "picked-area-label" })
  public pickedAreaLabel?: string;

  @property({ attribute: "pick-area-label" })
  public pickAreaLabel?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean }) public reorder = false;

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    const currentAreas = this._currentAreas;
    return html`
      <ha-sortable
        .disabled=${!this.reorder || this.disabled}
        handle-selector=".area-handle"
        @item-moved=${this._areaMoved}
      >
        <div class="list">
          ${currentAreas.map(
            (area) => html`
              <div class="area">
                <ha-area-picker
                  .curValue=${area}
                  .noAdd=${this.noAdd}
                  .hass=${this.hass}
                  .value=${area}
                  .label=${this.pickedAreaLabel}
                  .includeDomains=${this.includeDomains}
                  .excludeDomains=${this.excludeDomains}
                  .includeDeviceClasses=${this.includeDeviceClasses}
                  .deviceFilter=${this.deviceFilter}
                  .entityFilter=${this.entityFilter}
                  .disabled=${this.disabled}
                  @value-changed=${this._areaChanged}
                ></ha-area-picker>
                ${this.reorder
                  ? html`
                      <ha-svg-icon
                        class="area-handle"
                        .path=${mdiDragHorizontalVariant}
                      ></ha-svg-icon>
                    `
                  : nothing}
              </div>
            `
          )}
        </div>
      </ha-sortable>
      <div>
        <ha-area-picker
          .noAdd=${this.noAdd}
          .hass=${this.hass}
          .label=${this.pickAreaLabel}
          .helper=${this.helper}
          .includeDomains=${this.includeDomains}
          .excludeDomains=${this.excludeDomains}
          .includeDeviceClasses=${this.includeDeviceClasses}
          .deviceFilter=${this.deviceFilter}
          .entityFilter=${this.entityFilter}
          .disabled=${this.disabled}
          .placeholder=${this.placeholder}
          .required=${this.required && !currentAreas.length}
          @value-changed=${this._addArea}
          .excludeAreas=${currentAreas}
        ></ha-area-picker>
      </div>
    `;
  }

  private _areaMoved(e: CustomEvent) {
    e.stopPropagation();
    const { oldIndex, newIndex } = e.detail;
    const currentAreas = this._currentAreas;
    const movedArea = currentAreas[oldIndex];
    const newAreas = [...currentAreas];
    newAreas.splice(oldIndex, 1);
    newAreas.splice(newIndex, 0, movedArea);
    this._updateAreas(newAreas);
  }

  private get _currentAreas(): string[] {
    return this.value || [];
  }

  private async _updateAreas(areas) {
    this.value = areas;

    fireEvent(this, "value-changed", {
      value: areas,
    });
  }

  private _areaChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const curValue = (ev.currentTarget as any).curValue;
    const newValue = ev.detail.value;
    if (newValue === curValue) {
      return;
    }
    const currentAreas = this._currentAreas;
    if (!newValue || currentAreas.includes(newValue)) {
      this._updateAreas(currentAreas.filter((ent) => ent !== curValue));
      return;
    }
    this._updateAreas(
      currentAreas.map((ent) => (ent === curValue ? newValue : ent))
    );
  }

  private _addArea(ev: CustomEvent) {
    ev.stopPropagation();

    const toAdd = ev.detail.value;
    if (!toAdd) {
      return;
    }
    (ev.currentTarget as any).value = "";
    const currentAreas = this._currentAreas;
    if (currentAreas.includes(toAdd)) {
      return;
    }

    this._updateAreas([...currentAreas, toAdd]);
  }

  static override styles = css`
    div {
      margin-top: 8px;
    }
    .area {
      display: flex;
      flex-direction: row;
      align-items: center;
    }
    .area ha-area-picker {
      flex: 1;
    }
    .area-handle {
      padding: 8px;
      cursor: move; /* fallback if grab cursor is unsupported */
      cursor: grab;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-areas-picker": HaAreasPicker;
  }
}
