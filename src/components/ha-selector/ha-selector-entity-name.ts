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
    // Try entity area first, then fall back to device area
    const areaId = entityReg?.area_id || deviceReg?.area_id;
    const areaReg = areaId ? this.hass.areas?.[areaId] : undefined;
    const floorReg = areaReg?.floor_id
      ? this.hass.floors?.[areaReg.floor_id]
      : undefined;

    // Collect available names in priority order
    const entityName = entity.attributes.friendly_name || null;
    const deviceName = deviceReg?.name_by_user || deviceReg?.name || null;

    const names = {
      entity: entityName,
      device:
        deviceName && entityName && deviceName === entityName
          ? null
          : deviceName,
      area: areaReg?.name || null,
      floor: floorReg?.name || null,
    };

    // Add individual options first
    if (names.entity) {
      options.push({
        value: names.entity,
        label: names.entity,
        description: this.hass.localize(
          "ui.components.entity.entity-name-picker.entity_name"
        ),
      });
    }

    if (names.device && !options.find((opt) => opt.value === names.device)) {
      options.push({
        value: names.device,
        label: names.device,
        description: this.hass.localize(
          "ui.components.entity.entity-name-picker.device_name"
        ),
      });
    }

    if (names.area && !options.find((opt) => opt.value === names.area)) {
      options.push({
        value: names.area,
        label: names.area,
        description: this.hass.localize(
          "ui.components.entity.entity-name-picker.area_name"
        ),
      });
    }

    if (names.floor && !options.find((opt) => opt.value === names.floor)) {
      options.push({
        value: names.floor,
        label: names.floor,
        description: this.hass.localize(
          "ui.components.entity.entity-name-picker.floor_name"
        ),
      });
    }

    // Generate combinations with priority ordering
    this._addCombinationOptions(options, names);

    this._options = options;
  }

  private _addCombinationOptions(
    options: EntityNameOption[],
    names: {
      entity: string | null;
      device: string | null;
      area: string | null;
      floor: string | null;
    }
  ): void {
    const availableNames = Object.entries(names)
      .filter(([, name]) => name !== null)
      .map(([key, name]) => ({ key, name: name! }));

    // Generate all possible combinations (2-4 items)
    for (
      let combinationSize = 2;
      combinationSize <= availableNames.length;
      combinationSize++
    ) {
      this._generateCombinations(availableNames, combinationSize, options);
    }
  }

  private _generateCombinations(
    availableNames: { key: string; name: string }[],
    size: number,
    options: EntityNameOption[]
  ): void {
    const combinations: { key: string; name: string }[][] = [];
    this._getCombinations(availableNames, size, 0, [], combinations);

    for (const combination of combinations) {
      // Sort combination by priority (floor > area > device > entity)
      const priorityOrder = { floor: 0, area: 1, device: 2, entity: 3 };
      combination.sort((a, b) => priorityOrder[a.key] - priorityOrder[b.key]);

      const combinedName = combination.map((item) => item.name).join(" - ");
      const combinedDescription = combination
        .map((item) => {
          switch (item.key) {
            case "entity":
              return this.hass.localize(
                "ui.components.entity.entity-name-picker.entity_name"
              );
            case "device":
              return this.hass.localize(
                "ui.components.entity.entity-name-picker.device_name"
              );
            case "area":
              return this.hass.localize(
                "ui.components.entity.entity-name-picker.area_name"
              );
            case "floor":
              return this.hass.localize(
                "ui.components.entity.entity-name-picker.floor_name"
              );
            default:
              return "";
          }
        })
        .join(" + ");

      // Only add if not already present
      if (!options.find((opt) => opt.value === combinedName)) {
        options.push({
          value: combinedName,
          label: combinedName,
          description: combinedDescription,
        });
      }
    }
  }

  private _getCombinations<T>(
    items: T[],
    size: number,
    start: number,
    current: T[],
    result: T[][]
  ): void {
    if (current.length === size) {
      result.push([...current]);
      return;
    }

    for (let i = start; i < items.length; i++) {
      current.push(items[i]);
      this._getCombinations(items, size, i + 1, current, result);
      current.pop();
    }
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
