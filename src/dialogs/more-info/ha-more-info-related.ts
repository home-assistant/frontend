import { mdiDevices, mdiTextureBox } from "@mdi/js";
import { consume } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeAreaName } from "../../common/entity/compute_area_name";
import { computeDeviceNameDisplay } from "../../common/entity/compute_device_name";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeFloorName } from "../../common/entity/compute_floor_name";
import { getEntityContext } from "../../common/entity/context/get_entity_context";
import type { LocalizeKeys } from "../../common/translations/localize";
import "../../components/ha-floor-icon";
import "../../components/ha-icon";
import "../../components/ha-icon-next";
import "../../components/ha-label";
import "../../components/ha-related-items";
import "../../components/ha-svg-icon";
import "../../components/item/ha-list-item-button";
import "../../components/item/ha-list-item-value";
import "../../components/list/ha-grouped-list";
import { labelsContext } from "../../data/context";
import type { ExtEntityRegistryEntry } from "../../data/entity/entity_registry";
import type { LabelRegistryEntry } from "../../data/label/label_registry";
import type { ItemType, RelatedResult } from "../../data/search";
import { SearchableDomains } from "../../data/search";
import type { HomeAssistant } from "../../types";
import { brandsUrl } from "../../util/brands-url";

interface RelatedViewParams {
  entityId: string;
}

interface ContextEntry {
  translationKey: LocalizeKeys;
  value: string;
  displayValue?: TemplateResult;
  href?: string;
  icon?: TemplateResult;
}

const CONTEXT_SECTIONS: (keyof RelatedResult)[] = [
  "device",
  "area",
  "integration",
  "config_entry",
];

@customElement("ha-more-info-related")
class HaMoreInfoRelated extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public params?: RelatedViewParams;

  @state() private _stateObj?: HassEntity;

  @consume({ context: labelsContext, subscribe: true })
  @state()
  private _labels?: LabelRegistryEntry[];

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    if (changedProps.has("entry") && this.entry) {
      this.hass.loadBackendTranslation("title", [this.entry.platform]);
    }
    if (changedProps.has("params") || changedProps.has("hass")) {
      if (this.params?.entityId && this.hass) {
        this._stateObj = this.hass.states[this.params.entityId];
      }
    }
  }

  protected render() {
    if (!this.params || !this._stateObj) {
      return nothing;
    }

    const domain = computeDomain(this.params.entityId);
    const itemType = SearchableDomains.has(domain)
      ? (domain as ItemType)
      : "entity";

    const { floor, area, device } = getEntityContext(
      this._stateObj,
      this.hass.entities,
      this.hass.devices,
      this.hass.areas,
      this.hass.floors
    );
    const floorName = floor ? computeFloorName(floor) : undefined;
    const areaName = area ? (computeAreaName(area) ?? area.area_id) : undefined;
    const deviceName = device
      ? computeDeviceNameDisplay(device, this.hass.localize, this.hass.states)
      : undefined;
    const integrationName = this.entry?.platform
      ? this.hass.localize(`component.${this.entry.platform}.title`) ||
        this.entry.platform
      : undefined;
    const labels =
      this.entry?.labels.map((labelId) => ({
        id: labelId,
        entry: this._labels?.find((label) => label.label_id === labelId),
      })) ?? [];

    const contextEntries: ContextEntry[] = [];

    if (floor && floorName) {
      contextEntries.push({
        translationKey: "ui.dialogs.more_info_control.floor",
        value: floorName,
        href: "/config/areas/dashboard",
        icon: html`<ha-floor-icon slot="end" .floor=${floor}></ha-floor-icon>`,
      });
    }
    if (area && areaName) {
      contextEntries.push({
        translationKey: "ui.components.related-items.area",
        value: areaName,
        href: `/config/areas/area/${area.area_id}`,
        icon: area.icon
          ? html`<ha-icon slot="end" .icon=${area.icon}></ha-icon>`
          : html`<ha-svg-icon slot="end" .path=${mdiTextureBox}></ha-svg-icon>`,
      });
    }
    if (device && deviceName) {
      contextEntries.push({
        translationKey: "ui.components.related-items.device",
        value: deviceName,
        href: `/config/devices/device/${device.id}`,
        icon: html`<ha-svg-icon slot="end" .path=${mdiDevices}></ha-svg-icon>`,
      });
    }
    if (this.entry?.platform && integrationName) {
      contextEntries.push({
        translationKey: "ui.components.related-items.integration",
        value: integrationName,
        href: this.entry.config_entry_id
          ? `/config/integrations/integration/${this.entry.platform}#config_entry=${this.entry.config_entry_id}`
          : undefined,
        icon: html`<img
          slot="end"
          alt=""
          crossorigin="anonymous"
          referrerpolicy="no-referrer"
          src=${brandsUrl(
            {
              domain: this.entry.platform,
              type: "icon",
              darkOptimized: this.hass.themes?.darkMode,
            },
            this.hass.auth.data.hassUrl
          )}
        />`,
      });
    }
    if (labels.length) {
      contextEntries.push({
        translationKey: "ui.dialogs.more_info_control.labels",
        value: labels.map(({ id, entry }) => entry?.name ?? id).join(", "),
        displayValue: html`<div class="labels">
          ${labels.map(
            ({ id, entry }) => html`
              <ha-label
                class="text-ellipsis"
                .color=${entry?.color ?? undefined}
                .description=${entry?.description ?? undefined}
              >
                ${
                  entry?.icon
                    ? html`<ha-icon slot="icon" .icon=${entry.icon}></ha-icon>`
                    : nothing
                }
                ${entry?.name ?? id}
              </ha-label>
            `
          )}
        </div>`,
      });
    }

    return html`
      <div class="content">
        ${
          contextEntries.length
            ? html`
                <ha-grouped-list
                  .header=${this.hass.localize(
                    "ui.dialogs.more_info_control.context"
                  )}
                >
                  ${this._renderEntries(contextEntries)}
                </ha-grouped-list>
              `
            : nothing
        }
        <ha-related-items
          .hass=${this.hass}
          .itemId=${this.params.entityId}
          .itemType=${itemType}
          .exclude=${itemType === "entity" ? CONTEXT_SECTIONS : undefined}
        ></ha-related-items>
      </div>
    `;
  }

  private _renderEntries(entries: ContextEntry[]) {
    return entries.map((entry) => {
      const label = this.hass.localize(entry.translationKey);

      if (!entry.href) {
        return html`
          <ha-list-item-value .label=${label}
            >${entry.displayValue ?? entry.value}</ha-list-item-value
          >
        `;
      }

      return html`
        <ha-list-item-button .href=${entry.href}>
          <div class="link-row" slot="content">
            <div class="label">${label}</div>
            <div class="value">${entry.value}</div>
          </div>
          ${entry.icon ?? nothing}
          <ha-icon-next slot="end"></ha-icon-next>
        </ha-list-item-button>
      `;
    });
  }

  static styles: CSSResultGroup = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .content {
      padding: var(--ha-space-6);
      padding-bottom: max(var(--safe-area-inset-bottom), var(--ha-space-6));
    }

    ha-grouped-list + ha-related-items {
      margin-top: var(--ha-space-6);
    }

    ha-list-item-button {
      --ha-row-item-padding-block: var(--ha-space-2);
      --ha-row-item-min-height: 40px;
      --ha-row-item-gap: var(--ha-space-3);
      --mdc-icon-size: 20px;
    }

    ha-list-item-button::part(end) {
      gap: var(--ha-space-2);
    }

    ha-list-item-button img {
      width: 20px;
      height: 20px;
      object-fit: contain;
    }

    .link-row {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: var(--ha-space-3);
    }

    .link-row .label {
      flex: 1;
      color: var(--secondary-text-color);
    }

    .link-row .value {
      max-width: 60%;
      min-width: 0;
      text-align: end;
      overflow-wrap: anywhere;
    }

    .labels {
      display: flex;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: var(--ha-space-1);
    }

    .labels ha-label {
      min-width: 0;
      max-width: 100%;
    }

    ha-icon-next {
      color: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-related": HaMoreInfoRelated;
  }
}
