import { mdiContentCopy, mdiDevices, mdiTextureBox } from "@mdi/js";
import { consume } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
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
import "../../components/ha-floor-icon";
import "../../components/ha-icon";
import "../../components/ha-icon-next";
import "../../components/ha-label";
import "../../components/ha-svg-icon";
import "../../components/item/ha-list-item-button";
import "../../components/item/ha-list-item-value";
import "../../components/list/ha-grouped-list";
import { copyToClipboard } from "../../common/util/copy-clipboard";
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
import { brandsUrl } from "../../util/brands-url";
import { showToast } from "../../util/toast";

interface DetailsViewParams {
  entityId: string;
}

interface DetailEntry {
  translationKey: LocalizeKeys;
  value: string;
  displayValue?: TemplateResult;
  href?: string;
  icon?: TemplateResult;
  copyable?: boolean;
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
    } = this._getDetailData(
      this._stateObj,
      this.hass.formatEntityAttributeName
    );
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
    const labelNames = labels.map(({ id, entry }) => entry?.name ?? id);
    const contextEntries: DetailEntry[] = [];

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

    contextEntries.push(
      {
        translationKey: "ui.dialogs.more_info_control.entity_id",
        value: this.params.entityId,
        copyable: true,
      },
      {
        translationKey: "ui.dialogs.more_info_control.labels",
        value: labelNames.join(", ") || this.hass.localize("ui.common.none"),
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
      }
    );
    const yamlData = {
      context: {
        ...(floorName ? { floor: floorName } : {}),
        ...(areaName ? { area: areaName } : {}),
        ...(deviceName ? { device: deviceName } : {}),
        ...(integrationName ? { integration: integrationName } : {}),
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
                <ha-grouped-list>
                  ${this._renderEntries(contextEntries)}
                </ha-grouped-list>

                <ha-grouped-list
                  .header=${this.hass.localize(
                    "ui.components.entity.entity-state-picker.state"
                  )}
                >
                  ${this._renderEntries(stateEntries)}
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
      stateObj: HassEntity,
      // cache key only: a new function is assigned when translation-based
      // format functions reload, invalidating results formatted via this.hass
      _formatEntityAttributeName: HomeAssistant["formatEntityAttributeName"]
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
    return entries.map((entry) => {
      const label = this.hass.localize(entry.translationKey);

      if (!entry.href && !entry.copyable) {
        return html`
          <ha-list-item-value .label=${label}
            >${entry.displayValue ?? entry.value}</ha-list-item-value
          >
        `;
      }

      if (entry.copyable) {
        return html`
          <ha-list-item-button
            aria-label=${this.hass.localize(
              "ui.dialogs.more_info_control.copy_value",
              { label, value: entry.value }
            )}
            data-value=${entry.value}
            @click=${this._copyValue}
          >
            <div class="link-row" slot="content">
              <div class="label">${label}</div>
              <div class="value">${entry.value}</div>
            </div>
            <ha-svg-icon slot="end" .path=${mdiContentCopy}></ha-svg-icon>
          </ha-list-item-button>
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

  private async _copyValue(ev: Event) {
    const value = (ev.currentTarget as HTMLElement).dataset.value;
    if (value === undefined) {
      return;
    }
    await copyToClipboard(value);
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
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
