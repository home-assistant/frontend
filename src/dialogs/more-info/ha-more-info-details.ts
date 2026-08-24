import { consume } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeAreaName } from "../../common/entity/compute_area_name";
import { computeDeviceNameDisplay } from "../../common/entity/compute_device_name";
import { computeFloorName } from "../../common/entity/compute_floor_name";
import { getEntityContext } from "../../common/entity/context/get_entity_context";
import checkValidDate from "../../common/datetime/check_valid_date";
import { formatDateTimeWithSeconds } from "../../common/datetime/format_date_time";
import "../../components/ha-attribute-value";
import "../../components/item/ha-list-item-value";
import "../../components/list/ha-grouped-list";
import type { LocalizeKeys } from "../../common/translations/localize";
import { labelsContext } from "../../data/context";
import type { ExtEntityRegistryEntry } from "../../data/entity/entity_registry";
import type { LabelRegistryEntry } from "../../data/label/label_registry";
import type { HomeAssistant } from "../../types";
import "../../components/ha-yaml-editor";
import { computeDomain } from "../../common/entity/compute_domain";
import type { FeatureEnum } from "../../common/entity/get_domain_features";
import { getFeatures } from "../../common/entity/get_domain_features";
import { supportsFeature } from "../../common/entity/supports-feature";
import { titleCase } from "../../common/string/title-case";
import { stringCompare } from "../../common/string/compare";

interface DetailsViewParams {
  entityId: string;
}

interface DetailEntry {
  translationKey: LocalizeKeys;
  value: string;
  href?: string;
}

@customElement("ha-more-info-details")
class HaMoreInfoDetails extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public params?: DetailsViewParams;

  @property({ attribute: false }) public yamlMode = false;

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

    const {
      stateEntries,
      attributes,
      yamlData: stateYamlData,
    } = this._getDetailData(this._stateObj);
    const { floor, area, device, parentDevice } = getEntityContext(
      this._stateObj,
      this.hass.entities,
      this.hass.devices,
      this.hass.areas,
      this.hass.floors
    );
    const floorName = floor ? computeFloorName(floor) : undefined;
    const areaName = area ? (computeAreaName(area) ?? area.area_id) : undefined;
    const parentDeviceName = parentDevice
      ? computeDeviceNameDisplay(
          parentDevice,
          this.hass.localize,
          this.hass.states
        )
      : undefined;
    const deviceName = device
      ? computeDeviceNameDisplay(device, this.hass.localize, this.hass.states)
      : undefined;
    const integrationName = this.entry?.platform
      ? this.hass.localize(`component.${this.entry.platform}.title`) ||
        this.entry.platform
      : undefined;
    const labelNames =
      this.entry?.labels.map(
        (labelId) =>
          this._labels?.find((label) => label.label_id === labelId)?.name ??
          labelId
      ) ?? [];
    const contextEntries: DetailEntry[] = [];

    if (floor && floorName) {
      contextEntries.push({
        translationKey: "ui.dialogs.more_info_control.floor",
        value: floorName,
        href: "/config/areas/dashboard",
      });
    }
    if (area && areaName) {
      contextEntries.push({
        translationKey: "ui.components.related-items.area",
        value: areaName,
        href: `/config/areas/area/${area.area_id}`,
      });
    }
    if (parentDevice && parentDeviceName) {
      contextEntries.push({
        translationKey: "ui.dialogs.more_info_control.parent_device",
        value: parentDeviceName,
        href: `/config/devices/device/${parentDevice.id}`,
      });
    }
    if (device && deviceName) {
      contextEntries.push({
        translationKey: "ui.components.related-items.device",
        value: deviceName,
        href: `/config/devices/device/${device.id}`,
      });
    }
    if (this.entry?.platform && integrationName) {
      contextEntries.push({
        translationKey: "ui.components.related-items.integration",
        value: integrationName,
        href: this.entry.config_entry_id
          ? `/config/integrations/integration/${this.entry.platform}#config_entry=${this.entry.config_entry_id}`
          : undefined,
      });
    }

    const entityEntries: DetailEntry[] = [
      {
        translationKey: "ui.dialogs.more_info_control.entity_id",
        value: this.params.entityId,
      },
      {
        translationKey: "ui.dialogs.more_info_control.labels",
        value: labelNames.join(", ") || this.hass.localize("ui.common.none"),
      },
    ];
    const yamlData = {
      ...(contextEntries.length
        ? {
            context: {
              ...(floorName ? { floor: floorName } : {}),
              ...(areaName ? { area: areaName } : {}),
              ...(parentDeviceName ? { parent_device: parentDeviceName } : {}),
              ...(deviceName ? { device: deviceName } : {}),
              ...(integrationName ? { integration: integrationName } : {}),
            },
          }
        : {}),
      entity: {
        entity_id: this.params.entityId,
        labels: labelNames,
      },
      ...stateYamlData,
    };

    return html`
      <div class="content">
        ${
          this.yamlMode
            ? html`<ha-yaml-editor
                .value=${yamlData}
                read-only
                auto-update
                in-dialog
              ></ha-yaml-editor>`
            : html`
                ${
                  contextEntries.length
                    ? html`<ha-grouped-list
                        .header=${this.hass.localize(
                          "ui.dialogs.more_info_control.context"
                        )}
                      >
                        ${this._renderEntries(contextEntries)}
                      </ha-grouped-list>`
                    : nothing
                }

                <ha-grouped-list
                  .header=${this.hass.localize(
                    "ui.components.entity.entity-state-picker.state"
                  )}
                >
                  ${this._renderEntries(stateEntries)}
                </ha-grouped-list>

                <ha-grouped-list
                  .header=${this.hass.localize(
                    "ui.dialogs.more_info_control.entity"
                  )}
                >
                  ${this._renderEntries(entityEntries)}
                </ha-grouped-list>

                <ha-grouped-list
                  .header=${this.hass.localize(
                    "ui.dialogs.more_info_control.attributes"
                  )}
                >
                  ${this._renderAttributes(attributes)}
                </ha-grouped-list>
              `
        }
      </div>
    `;
  }

  private _getDetailData = memoizeOne(
    (
      stateObj: HassEntity
    ): {
      stateEntries: DetailEntry[];
      attributes: { name: string; label: string }[];
      yamlData: {
        state: {
          translated: string;
          raw: string;
          last_changed: string;
          last_updated: string;
        };
        attributes: Record<string, string>;
      };
    } => {
      const translatedState = this.hass.formatEntityState(stateObj);

      const attributes = Object.keys(stateObj.attributes)
        .map((a) => ({
          name: a,
          label: this.hass.formatEntityAttributeName(stateObj, a),
        }))
        .sort((a, b) =>
          stringCompare(a.label, b.label, this.hass.locale.language)
        );

      return {
        stateEntries: [
          {
            translationKey: "ui.dialogs.more_info_control.translated",
            value: translatedState,
          },
          {
            translationKey: "ui.dialogs.more_info_control.raw",
            value: stateObj.state,
          },
          {
            translationKey: "ui.dialogs.more_info_control.last_changed",
            value: this._formatTimestamp(stateObj.last_changed),
          },
          {
            translationKey: "ui.dialogs.more_info_control.last_updated",
            value: this._formatTimestamp(stateObj.last_updated),
          },
        ],
        attributes,
        yamlData: {
          state: {
            translated: translatedState,
            raw: stateObj.state,
            last_changed: stateObj.last_changed,
            last_updated: stateObj.last_updated,
          },
          attributes: stateObj.attributes,
        },
      };
    }
  );

  private _formatTimestamp(value: string): string {
    const date = new Date(value);

    return checkValidDate(date)
      ? formatDateTimeWithSeconds(date, this.hass.locale, this.hass.config)
      : value;
  }

  private _renderEntries(entries: DetailEntry[]) {
    return entries.map(
      (entry) => html`
        <ha-list-item-value .label=${this.hass.localize(entry.translationKey)}>
          ${
            entry.href
              ? html`<a href=${entry.href}>${entry.value}</a>`
              : entry.value
          }
        </ha-list-item-value>
      `
    );
  }

  private _renderAttributes(attributes: { name: string; label: string }[]) {
    if (attributes.length === 0) {
      return html`<div class="empty">
        ${this.hass.localize("ui.common.none")}
      </div>`;
    }

    let featureEnum: FeatureEnum | undefined;
    if (this._stateObj?.attributes.supported_features !== undefined) {
      const domain = computeDomain(this.params!.entityId);
      featureEnum = getFeatures(domain);
    }

    return attributes.map(
      (attribute) => html`
        <ha-list-item-value .label=${attribute.label}>
          ${
            attribute.name === "supported_features" && featureEnum
              ? this._renderFeatures(featureEnum, this._stateObj!)
              : html`
                  <ha-attribute-value
                    .attribute=${attribute.name}
                    .stateObj=${this._stateObj}
                  ></ha-attribute-value>
                `
          }
        </ha-list-item-value>
      `
    );
  }

  private _renderFeatures(
    featureEnum: FeatureEnum,
    stateObj: HassEntity
  ): string {
    return (
      Object.entries(featureEnum)
        .filter(([_key, value]) => typeof value === "number")
        .map(([key, value]) =>
          supportsFeature(stateObj, value as number)
            ? titleCase(key.replaceAll("_", "\u00A0").toLowerCase())
            : undefined
        )
        .filter(Boolean)
        .join(", ") || this.hass.localize("ui.common.none")
    );
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

    ha-grouped-list + ha-grouped-list {
      margin-top: var(--ha-space-4);
    }

    a {
      color: var(--primary-color);
    }

    .empty {
      color: var(--secondary-text-color);
      text-align: center;
      padding: var(--ha-space-3) var(--ha-space-4);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-details": HaMoreInfoDetails;
  }
}
