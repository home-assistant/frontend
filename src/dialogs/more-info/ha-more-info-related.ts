import { mdiDevices, mdiTextureBox } from "@mdi/js";
import { consume } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { computeAreaName } from "../../common/entity/compute_area_name";
import { computeDeviceNameDisplay } from "../../common/entity/compute_device_name";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeEntityName } from "../../common/entity/compute_entity_name";
import { computeFloorName } from "../../common/entity/compute_floor_name";
import { computeStateName } from "../../common/entity/compute_state_name";
import { getEntityContext } from "../../common/entity/context/get_entity_context";
import type { LocalizeKeys } from "../../common/translations/localize";
import "../../components/ha-floor-icon";
import "../../components/ha-icon";
import "../../components/ha-icon-next";
import "../../components/ha-label";
import "../../components/ha-related-items";
import "../../components/ha-state-icon";
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
  /** Navigates out of the dialog. */
  href?: string;
  /** Switches to another view inside the dialog. */
  action?: () => void;
  icon?: TemplateResult;
  /**
   * Draws the row like the logbook detail subject row: icon at the start, the
   * label as the headline and the value below it. Set on the rows that name a
   * thing (entity, device, area, floor) rather than carry a plain value.
   */
  subject?: boolean;
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

    const contextEntries: ContextEntry[] = [
      {
        translationKey: "ui.dialogs.more_info_control.entity",
        value:
          computeEntityName(
            this._stateObj,
            this.hass.entities,
            this.hass.devices
          ) || computeStateName(this._stateObj),
        action: this._goToDetails,
        icon: html`<ha-state-icon .stateObj=${this._stateObj}></ha-state-icon>`,
        subject: true,
      },
    ];

    if (device && deviceName) {
      contextEntries.push({
        translationKey: "ui.components.related-items.device",
        value: deviceName,
        href: `/config/devices/device/${device.id}`,
        icon: html`<ha-svg-icon .path=${mdiDevices}></ha-svg-icon>`,
        subject: true,
      });
    }
    if (area && areaName) {
      contextEntries.push({
        translationKey: "ui.components.related-items.area",
        value: areaName,
        href: `/config/areas/area/${area.area_id}`,
        icon: area.icon
          ? html`<ha-icon .icon=${area.icon}></ha-icon>`
          : html`<ha-svg-icon .path=${mdiTextureBox}></ha-svg-icon>`,
        subject: true,
      });
    }
    if (floor && floorName) {
      contextEntries.push({
        translationKey: "ui.dialogs.more_info_control.floor",
        value: floorName,
        href: "/config/areas/dashboard",
        icon: html`<ha-floor-icon .floor=${floor}></ha-floor-icon>`,
        subject: true,
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
          alt=""
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
        subject: true,
      });
    }
    contextEntries.push({
      translationKey: "ui.dialogs.more_info_control.labels",
      value:
        labels.map(({ id, entry }) => entry?.name ?? id).join(", ") ||
        this.hass.localize("ui.dialogs.more_info_control.no_labels"),
      displayValue: labels.length
        ? html`<div class="labels">
            ${labels.map(
              ({ id, entry }) => html`
                <ha-label
                  class="text-ellipsis"
                  .color=${entry?.color ?? undefined}
                  .description=${entry?.description ?? undefined}
                >
                  ${
                    entry?.icon
                      ? html`<ha-icon
                          slot="icon"
                          .icon=${entry.icon}
                        ></ha-icon>`
                      : nothing
                  }
                  ${entry?.name ?? id}
                </ha-label>
              `
            )}
          </div>`
        : undefined,
    });

    return html`
      <div class="content">
        <ha-grouped-list>
          ${this._renderEntries(contextEntries)}
        </ha-grouped-list>
        <ha-related-items
          .hass=${this.hass}
          .itemId=${this.params.entityId}
          .itemType=${itemType}
          .exclude=${itemType === "entity" ? CONTEXT_SECTIONS : undefined}
        ></ha-related-items>
      </div>
    `;
  }

  private _goToDetails = () => {
    fireEvent(this, "hass-more-info", {
      entityId: this.params!.entityId,
      view: "details",
    });
  };

  private _renderEntries(entries: ContextEntry[]) {
    return entries.map((entry) => {
      const label = this.hass.localize(entry.translationKey);

      if (!entry.href && !entry.action) {
        return html`
          <ha-list-item-value .label=${label}
            >${entry.displayValue ?? entry.value}</ha-list-item-value
          >
        `;
      }

      if (entry.subject) {
        return html`
          <ha-list-item-button
            class="subject"
            .href=${entry.href}
            @click=${entry.action ?? nothing}
            .headline=${label}
            .supportingText=${entry.value}
          >
            <span class="subject-icon" slot="start">${entry.icon}</span>
            <ha-icon-next slot="end"></ha-icon-next>
          </ha-list-item-button>
        `;
      }

      return html`
        <ha-list-item-button
          .href=${entry.href}
          @click=${entry.action ?? nothing}
        >
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

    ha-related-items {
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

    /* Matches the logbook activity detail subject row. */
    ha-list-item-button.subject {
      --ha-row-item-min-height: 56px;
      --mdc-icon-size: 24px;
    }

    /* The two lines trade places: the type reads as the quiet label on top,
       the name carries the row below it. */
    ha-list-item-button.subject::part(headline) {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
    }

    ha-list-item-button.subject::part(supporting-text) {
      color: var(--primary-text-color);
      font-size: inherit;
      font-weight: var(--ha-font-weight-medium);
    }

    .subject-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      color: var(--secondary-text-color);
      --state-icon-color: var(--secondary-text-color);
    }

    ha-list-item-button img {
      width: 20px;
      height: 20px;
      object-fit: contain;
    }

    /* the brand logo matches the glyphs the other subject rows draw */
    ha-list-item-button.subject img {
      width: 24px;
      height: 24px;
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
