import type { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import type { PropertyValues } from "lit";
import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { EntityNameSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-combo-box";
import "../ha-input-helper-text";

interface EntityNameOption {
  value: string;
  label: string;
  description: string;
}

@customElement("ha-selector-entity_name")
export class HaEntityNameSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: EntityNameSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @property({ attribute: false }) public context?: {
    entity?: string;
  };

  @state() private _opened = false;

  @state() private _options: EntityNameOption[] = [];

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return !(!changedProps.has("_opened") && this._opened);
  }

  protected updated(changedProps: PropertyValues): void {
    if (
      (changedProps.has("_opened") && this._opened) ||
      changedProps.has("selector") ||
      changedProps.has("context")
    ) {
      this._updateOptions();
    }
  }

  private _updateOptions(): void {
    if (!this.hass) {
      return;
    }

    const entityId = this.context?.entity || this.selector?.entity_name?.entity;

    if (!entityId) {
      this._options = [];
      return;
    }

    const options: EntityNameOption[] = [];
    const entity = this.hass.states[entityId];

    if (!entity) {
      this._options = [];
      return;
    }

    const entityReg = this.hass.entities?.[entityId];
    const deviceReg = entityReg?.device_id
      ? this.hass.devices?.[entityReg.device_id]
      : undefined;
    const areaReg = entityReg?.area_id
      ? this.hass.areas?.[entityReg.area_id]
      : undefined;
    const floorReg = areaReg?.floor_id
      ? this.hass.floors?.[areaReg.floor_id]
      : undefined;

    if (entity.attributes.friendly_name) {
      options.push({
        value: entity.attributes.friendly_name,
        label: entity.attributes.friendly_name,
        description: this.hass.localize(
          "ui.components.entity.entity-name-picker.entity_name"
        ),
      });
    }

    if (deviceReg?.name_by_user || deviceReg?.name) {
      const deviceName = deviceReg.name_by_user || deviceReg.name;
      if (deviceName && !options.find((opt) => opt.value === deviceName)) {
        options.push({
          value: deviceName,
          label: deviceName,
          description: this.hass.localize(
            "ui.components.entity.entity-name-picker.device_name"
          ),
        });
      }
    }

    if (areaReg?.name) {
      if (!options.find((opt) => opt.value === areaReg.name)) {
        options.push({
          value: areaReg.name!,
          label: areaReg.name!,
          description: this.hass.localize(
            "ui.components.entity.entity-name-picker.area_name"
          ),
        });
      }
    }

    if (floorReg?.name) {
      if (!options.find((opt) => opt.value === floorReg.name)) {
        options.push({
          value: floorReg.name!,
          label: floorReg.name!,
          description: this.hass.localize(
            "ui.components.entity.entity-name-picker.floor_name"
          ),
        });
      }
    }

    this._options = options;
  }

  private _rowRenderer: ComboBoxLitRenderer<EntityNameOption> = (
    item: EntityNameOption
  ) => html`
    <ha-combo-box-item>
      <span slot="headline">${item.label}</span>
      <span slot="supporting-text">${item.description}</span>
    </ha-combo-box-item>
  `;

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <ha-combo-box
        .hass=${this.hass}
        .value=${this.value || ""}
        .label=${this.label ||
        this.hass.localize("ui.components.entity.entity-name-picker.label")}
        .disabled=${this.disabled}
        .required=${this.required}
        .allowCustomValue=${true}
        .items=${this._options}
        .renderer=${this._rowRenderer}
        item-id-path="value"
        item-value-path="value"
        item-label-path="value"
        @opened-changed=${this._openedChanged}
        @value-changed=${this._valueChanged}
      ></ha-combo-box>
      ${this.helper
        ? html`<ha-input-helper-text .disabled=${this.disabled}
            >${this.helper}</ha-input-helper-text
          >`
        : nothing}
    `;
  }

  private _openedChanged(ev: CustomEvent): void {
    this._opened = ev.detail.value;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newValue = ev.detail.value;
    if (this.disabled || newValue === this.value) {
      return;
    }

    this.value = newValue;
    this._fireValueChanged(newValue);
  }

  private _fireValueChanged(value: string): void {
    setTimeout(() => {
      fireEvent(this, "value-changed", { value });
      fireEvent(this, "change");
    }, 0);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-entity_name": HaEntityNameSelector;
  }
}
