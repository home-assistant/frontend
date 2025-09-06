import type { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { registerStyles } from "@vaadin/vaadin-themable-mixin/register-styles";
import { fireEvent } from "../../common/dom/fire_event";
import type { EntityNameSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-combo-box";
import "../ha-input-helper-text";

registerStyles(
  "vaadin-combo-box-item",
  css`
    :host(:hover:not([disabled])) {
      background-color: rgba(var(--rgb-primary-text-color), 0.04);
    }
  `
);

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

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return !(!changedProps.has("_opened") && this._opened);
  }

  private get _options(): EntityNameOption[] {
    if (!this.hass) {
      return [];
    }

    const entityId = this.context?.entity || this.selector?.entity_name?.entity;
    const entity = entityId ? this.hass.states[entityId] : undefined;

    if (!entity) {
      return [];
    }

    const entityReg = this.hass.entities?.[entityId!];
    const deviceReg = entityReg?.device_id
      ? this.hass.devices?.[entityReg.device_id]
      : undefined;
    const areaId = entityReg?.area_id || deviceReg?.area_id;
    const areaReg = areaId ? this.hass.areas?.[areaId] : undefined;
    const floorReg = areaReg?.floor_id
      ? this.hass.floors?.[areaReg.floor_id]
      : undefined;

    const entityName = entity.attributes.friendly_name?.trim() || null;
    const deviceName =
      (deviceReg?.name_by_user || deviceReg?.name)?.trim() || null;

    const names = {
      entity: entityName,
      device:
        deviceName && entityName && deviceName === entityName
          ? null
          : deviceName,
      area: areaReg?.name?.trim() || null,
      floor: floorReg?.name?.trim() || null,
    };

    return this._generateAllOptions(names);
  }

  private _generateAllOptions(names: {
    entity: string | null;
    device: string | null;
    area: string | null;
    floor: string | null;
  }): EntityNameOption[] {
    const options: EntityNameOption[] = [];
    const nameTypes = [
      { key: "entity", name: names.entity, localeKey: "entity_name" },
      { key: "device", name: names.device, localeKey: "device_name" },
      { key: "area", name: names.area, localeKey: "area_name" },
      { key: "floor", name: names.floor, localeKey: "floor_name" },
    ] as const;

    const availableNames = nameTypes.filter((item) => item.name);

    // Add individual options
    for (const item of availableNames) {
      if (!options.find((opt) => opt.value === item.name)) {
        options.push({
          value: item.name!,
          label: item.name!,
          description: this.hass.localize(
            `ui.components.entity.entity-name-picker.${item.localeKey}`
          ),
        });
      }
    }

    // Generate combinations (2-4 items) - use reverse priority order
    const priorityOrderedNames = [...availableNames].reverse();
    for (let size = 2; size <= priorityOrderedNames.length; size++) {
      this._addCombinations(priorityOrderedNames, size, options);
    }

    return options;
  }

  private _addCombinations(
    availableNames: readonly {
      key: string;
      name: string | null;
      localeKey: string;
    }[],
    size: number,
    options: EntityNameOption[]
  ): void {
    const generateCombos = (
      start: number,
      current: (typeof availableNames)[0][]
    ): void => {
      if (current.length === size) {
        // Names are already in priority order (floor > area > device > entity)
        const combinedName = current.map((item) => item.name).join(" - ");
        // Description should also be in the same order as the combined name
        const combinedDescription = current
          .map((item) =>
            this.hass.localize(
              `ui.components.entity.entity-name-picker.${item.localeKey}`
            )
          )
          .join(" + ");

        // Only add if not already present
        if (!options.find((opt) => opt.value === combinedName)) {
          options.push({
            value: combinedName,
            label: combinedName,
            description: combinedDescription,
          });
        }
        return;
      }

      for (let i = start; i < availableNames.length; i++) {
        current.push(availableNames[i]);
        generateCombos(i + 1, current);
        current.pop();
      }
    };

    generateCombos(0, []);
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
