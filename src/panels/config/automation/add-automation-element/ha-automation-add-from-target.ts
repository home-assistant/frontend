import "@home-assistant/webawesome/dist/components/tree-item/tree-item";
import "@home-assistant/webawesome/dist/components/tree/tree";
import type { WaLazyLoadEvent } from "@home-assistant/webawesome/dist/events/lazy-load";
import type { WaSelectionChangeEvent } from "@home-assistant/webawesome/dist/events/selection-change";
import { consume } from "@lit/context";
import { mdiSelectionMarker, mdiTextureBox } from "@mdi/js";
import type { HassServiceTarget } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-floor-icon";
import "../../../../components/ha-icon";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-section-title";
import "../../../../components/ha-svg-icon";
import {
  getAreasNestedInFloors,
  type AreaFloorValue,
  type FloorComboBoxItem,
  type FloorNestedComboBoxItem,
} from "../../../../data/area_floor";
import {
  areasContext,
  devicesContext,
  entitiesContext,
  floorsContext,
  labelsContext,
  localizeContext,
  statesContext,
} from "../../../../data/context";
import {
  getLabels,
  type LabelRegistryEntry,
} from "../../../../data/label_registry";
import { extractFromTarget } from "../../../../data/target";
import type { HomeAssistant } from "../../../../types";

const SEPARATOR = "________";

@customElement("ha-automation-add-from-target")
export default class HaAutomationAddFromTarget extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public value?: HassServiceTarget;

  // #region context
  @state()
  @consume({ context: localizeContext, subscribe: true })
  private localize!: HomeAssistant["localize"];

  @state()
  @consume({ context: statesContext, subscribe: true })
  private states!: HomeAssistant["states"];

  @state()
  @consume({ context: floorsContext, subscribe: true })
  private floors!: HomeAssistant["floors"];

  @state()
  @consume({ context: areasContext, subscribe: true })
  private areas!: HomeAssistant["areas"];

  @state()
  @consume({ context: devicesContext, subscribe: true })
  private devices!: HomeAssistant["devices"];

  @state()
  @consume({ context: entitiesContext, subscribe: true })
  private entities!: HomeAssistant["entities"];

  @state()
  @consume({ context: labelsContext, subscribe: true })
  private _labelRegistry!: LabelRegistryEntry[];
  // #endregion context

  @state()
  private _areaEntries: Record<
    string,
    {
      devices: string[];
      entities: string[];
    }
  > = {};

  private _getAreasAndFloorsMemoized = memoizeOne(getAreasNestedInFloors);

  private _getLabelsMemoized = memoizeOne(getLabels);

  protected render() {
    const areaFloors = this._getAreaFloors();
    const labels = this._getLabelsMemoized(
      this.states,
      this.areas,
      this.devices,
      this.entities,
      this._labelRegistry,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      `label${SEPARATOR}`
    );

    return html`
      <ha-section-title
        >${this.localize(
          "ui.panel.config.automation.editor.home"
        )}</ha-section-title
      >
      <wa-tree @wa-selection-change=${this._handleSelectionChange}>
        ${areaFloors.map((floor, index) =>
          index === 0 && !floor.id
            ? this._renderAreas(floor.areas)
            : html`<wa-tree-item
                .disabledSelection=${!floor.id}
                .target=${floor.id}
                .selected=${!!floor.id &&
                this._getSelectedTargetId(this.value) === floor.id}
              >
                ${floor.id && (floor as FloorNestedComboBoxItem).floor
                  ? html`<ha-floor-icon
                      .floor=${(floor as FloorNestedComboBoxItem).floor}
                    ></ha-floor-icon>`
                  : html`<ha-svg-icon
                      .path=${mdiSelectionMarker}
                    ></ha-svg-icon>`}
                ${!floor.id
                  ? this.localize("ui.components.area-picker.unassigned_areas")
                  : floor.primary}
                ${this._renderAreas(floor.areas)}
              </wa-tree-item>`
        )}
      </wa-tree>
      ${labels.length
        ? html`<ha-section-title
              >${this.localize(
                "ui.components.label-picker.labels"
              )}</ha-section-title
            >
            <ha-md-list>
              ${labels.map(
                (label) =>
                  html`<ha-md-list-item
                    interactive
                    type="button"
                    .target=${label.id}
                    @click=${this._selectLabel}
                    class=${this._getSelectedTargetId(this.value) === label.id
                      ? "selected"
                      : ""}
                    >${label.icon
                      ? html`<ha-icon
                          slot="start"
                          .icon=${label.icon}
                        ></ha-icon>`
                      : label.icon_path
                        ? html`<ha-svg-icon
                            slot="start"
                            .path=${label.icon_path}
                          ></ha-svg-icon>`
                        : nothing}
                    <div slot="headline">${label.primary}</div>
                  </ha-md-list-item>`
              )}
            </ha-md-list>`
        : nothing}
    `;
  }

  private _renderAreas(areas: FloorComboBoxItem[] = []) {
    return areas.map(
      ({ id, primary, icon, icon_path }) =>
        html`<wa-tree-item
          lazy
          @wa-lazy-load=${this._loadArea}
          .target=${id}
          .selected=${this._getSelectedTargetId(this.value) === id}
        >
          ${icon
            ? html`<ha-icon .icon=${icon}></ha-icon>`
            : html`<ha-svg-icon
                .path=${icon_path || mdiTextureBox}
              ></ha-svg-icon>`}
          ${primary}
          ${this._areaEntries[id]?.devices.length
            ? this._renderDevices(this._areaEntries[id]?.devices)
            : nothing}
          ${this._areaEntries[id]?.entities.length
            ? this._renderEntities(this._areaEntries[id]?.entities)
            : nothing}
        </wa-tree-item>`
    );
  }

  private _renderDevices(devices: string[] = []) {
    return devices.map(
      (deviceId) =>
        html`<wa-tree-item
          lazy
          @wa-lazy-load=${this._loadArea}
          .target=${`device${SEPARATOR}${deviceId}`}
          .selected=${this._getSelectedTargetId(this.value) ===
          `device${SEPARATOR}${deviceId}`}
        >
          ${deviceId}
        </wa-tree-item>`
    );
  }

  private _renderEntities(entities: string[] = []) {
    return entities.map(
      (entityId) =>
        html`<wa-tree-item
          lazy
          @wa-lazy-load=${this._loadArea}
          .target=${`entity${SEPARATOR}${entityId}`}
          .selected=${this._getSelectedTargetId(this.value) ===
          `entity${SEPARATOR}${entityId}`}
        >
          ${entityId}
        </wa-tree-item>`
    );
  }

  private _getSelectedTargetId = memoizeOne(
    (value: HassServiceTarget | undefined) =>
      value && Object.keys(value).length
        ? `${Object.keys(value)[0].replace("_id", "")}${SEPARATOR}${Object.values(value)[0]}`
        : undefined
  );

  private _getAreaFloors = () =>
    this._getAreasAndFloorsMemoized(
      this.states,
      this.floors,
      this.areas,
      this.devices,
      this.entities,
      this._formatId,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      true
    );

  private _formatId = memoizeOne((value: AreaFloorValue): string =>
    [value.type, value.id].join(SEPARATOR)
  );

  private _handleSelectionChange(ev: WaSelectionChangeEvent) {
    const treeItem = ev.detail.selection[0] as unknown as
      | { target?: string }
      | undefined;

    if (treeItem?.target) {
      this._valueChanged(treeItem.target);
    }
  }

  private _selectLabel(ev: CustomEvent) {
    const target = (ev.currentTarget as any).target;

    if (target) {
      this._valueChanged(target);
    }
  }

  private _valueChanged(itemId: string) {
    const [type, id] = itemId.split(SEPARATOR, 2);

    fireEvent(this, "value-changed", {
      value: { [`${type}_id`]: id },
    });
  }

  private async _loadArea(ev: WaLazyLoadEvent) {
    const treeItem = ev.target as unknown as { target?: string };

    if (treeItem.target) {
      const [type, id] = treeItem.target.split(SEPARATOR, 2);
      try {
        const targetEntries = await extractFromTarget(this.hass, {
          [`${type}_id`]: id,
        });

        const areaEntries: {
          devices: string[];
          entities: string[];
        } = {
          devices: targetEntries.referenced_devices,
          entities: [],
        };

        areaEntries.entities = targetEntries.referenced_entities.filter(
          (entity_id) => {
            const entity = this.hass.entities[entity_id];
            return !areaEntries.devices.includes(entity.device_id || "");
          }
        );

        this._areaEntries = {
          ...this._areaEntries,
          [treeItem.target]: areaEntries,
        };
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Failed to extract target", e);
      }
    }
  }

  static styles = css`
    :host {
      --wa-color-neutral-fill-quiet: var(--ha-color-fill-primary-normal-active);
    }

    ha-section-title {
      top: 0;
      position: sticky;
      z-index: 1;
    }

    wa-tree-item::part(item) {
      height: var(--ha-space-10);
      padding: var(--ha-space-1) var(--ha-space-3);
      cursor: pointer;
      border-inline-start: 0;
    }
    wa-tree-item::part(label) {
      gap: var(--ha-space-3);
      font-family: var(--ha-font-family-heading);
      font-weight: var(--ha-font-weight-medium);
    }

    ha-svg-icon,
    ha-icon,
    ha-floor-icon {
      padding: var(--ha-space-1);
      color: var(--ha-color-on-neutral-quiet);
    }

    wa-tree-item::part(item):hover {
      background-color: var(--ha-color-fill-neutral-quiet-hover);
    }

    wa-tree-item[selected],
    wa-tree-item[selected] > ha-svg-icon,
    wa-tree-item[selected] > ha-icon,
    wa-tree-item[selected] > ha-floor-icon {
      color: var(--ha-color-on-primary-normal);
    }

    wa-tree-item[selected]::part(item):hover {
      background-color: var(--ha-color-fill-primary-normal-hover);
    }

    wa-tree-item::part(base).tree-item-selected .item {
      background-color: yellow;
    }

    ha-md-list {
      padding: 0;
      --md-list-item-leading-space: var(--ha-space-3);
      --md-list-item-trailing-space: var(--md-list-item-leading-space);
      --md-list-item-bottom-space: var(--ha-space-1);
      --md-list-item-top-space: var(--md-list-item-bottom-space);
      --md-list-item-supporting-text-font: var(--ha-font-size-s);
      --md-list-item-one-line-container-height: var(--ha-space-10);
    }

    ha-md-list-item.selected {
      background-color: var(--ha-color-fill-primary-normal-active);
      --md-list-item-label-text-color: var(--ha-color-on-primary-normal);
      --icon-primary-color: var(--ha-color-on-primary-normal);
    }

    ha-md-list-item.selected ha-icon,
    ha-md-list-item.selected ha-svg-icon {
      color: var(--ha-color-on-primary-normal);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-add-from-target": HaAutomationAddFromTarget;
  }
}
