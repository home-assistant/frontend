import { mdiFileCodeOutline, mdiPackageVariant, mdiWeb } from "@mdi/js";
import type { TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeRTL } from "../../../common/util/compute_rtl";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import type { DeviceRegistryEntry } from "../../../data/device/device_registry";
import type { EntityRegistryEntry } from "../../../data/entity/entity_registry";
import type { IntegrationManifest } from "../../../data/integration";
import type { HomeAssistant } from "../../../types";
import type { ConfigEntryExtended } from "./ha-config-integrations";

@customElement("ha-integration-card-footer")
export class HaIntegrationCardFooter extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public manifest?: IntegrationManifest;

  @property({ attribute: false }) public items!: ConfigEntryExtended[];

  @property({ attribute: false })
  public entityRegistryEntries!: EntityRegistryEntry[];

  @property({ attribute: false }) public domainEntities: string[] = [];

  protected render(): TemplateResult | typeof nothing {
    const devices = this._getDevices(this.items, this.hass.devices);
    const entitiesCount = devices.length
      ? 0
      : this._getEntityCount(
          this.items,
          this.entityRegistryEntries,
          this.domainEntities
        );

    const services = !devices.some((device) => device.entry_type !== "service");

    const hasIcons =
      Boolean(this.manifest && !this.manifest.is_built_in) ||
      Boolean(this.manifest?.iot_class?.startsWith("cloud_")) ||
      Boolean(
        this.manifest &&
        !this.manifest.config_flow &&
        !this.items.every((itm) => itm.source === "system")
      );

    let countBadge: TemplateResult | typeof nothing = nothing;
    if (devices.length > 0) {
      countBadge = html`<span class="count-badge"
        >${this.hass.localize(
          `ui.panel.config.integrations.config_entry.${services ? "services" : "devices"}`,
          { count: devices.length }
        )}</span
      >`;
    } else if (entitiesCount > 0) {
      countBadge = html`<span class="count-badge"
        >${this.hass.localize(
          `ui.panel.config.integrations.config_entry.entities`,
          { count: entitiesCount }
        )}</span
      >`;
    } else if (this.items.find((itm) => itm.source !== "yaml")) {
      countBadge = html`<span class="count-badge"
        >${this.hass.localize(
          `ui.panel.config.integrations.config_entry.entries`,
          {
            count: this.items.filter((itm) => itm.source !== "yaml").length,
          }
        )}</span
      >`;
    }

    if (countBadge === nothing && !hasIcons) return nothing;

    return html`
      <div class="footer">
        ${countBadge}
        <div class="icons">
          ${this.manifest && !this.manifest.is_built_in
            ? html`<span
                class="icon ${this.manifest.overwrites_built_in
                  ? "overwrites"
                  : "custom"}"
              >
                <ha-svg-icon
                  id="icon-custom"
                  .path=${mdiPackageVariant}
                ></ha-svg-icon>
                <ha-tooltip
                  for="icon-custom"
                  .placement=${computeRTL(
                    this.hass.language,
                    this.hass.translationMetadata.translations
                  )
                    ? "right"
                    : "left"}
                >
                  ${this.hass.localize(
                    this.manifest.overwrites_built_in
                      ? "ui.panel.config.integrations.config_entry.custom_overwrites_core"
                      : "ui.panel.config.integrations.config_entry.custom_integration"
                  )}
                </ha-tooltip>
              </span>`
            : nothing}
          ${this.manifest && this.manifest.iot_class?.startsWith("cloud_")
            ? html`<div class="icon cloud">
                <ha-svg-icon id="icon-cloud" .path=${mdiWeb}></ha-svg-icon>
                <ha-tooltip
                  for="icon-cloud"
                  .placement=${computeRTL(
                    this.hass.language,
                    this.hass.translationMetadata.translations
                  )
                    ? "right"
                    : "left"}
                >
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.depends_on_cloud"
                  )}
                </ha-tooltip>
              </div>`
            : nothing}
          ${this.manifest &&
          !this.manifest?.config_flow &&
          !this.items.every((itm) => itm.source === "system")
            ? html`<div class="icon yaml">
                <ha-svg-icon
                  id="icon-yaml"
                  .path=${mdiFileCodeOutline}
                ></ha-svg-icon>
                <ha-tooltip
                  for="icon-yaml"
                  .placement=${computeRTL(
                    this.hass.language,
                    this.hass.translationMetadata.translations
                  )
                    ? "right"
                    : "left"}
                >
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.no_config_flow"
                  )}
                </ha-tooltip>
              </div>`
            : nothing}
        </div>
      </div>
    `;
  }

  private _getEntityCount = memoizeOne(
    (
      configEntry: ConfigEntryExtended[],
      entityRegistryEntries: EntityRegistryEntry[],
      domainEntities: string[]
    ): number => {
      if (!entityRegistryEntries) {
        return domainEntities.length;
      }

      const entryIds = configEntry
        .map((entry) => entry.entry_id)
        .filter(Boolean);

      if (!entryIds.length) {
        return domainEntities.length;
      }

      const entityRegEntities = entityRegistryEntries.filter(
        (entity) =>
          entity.config_entry_id && entryIds.includes(entity.config_entry_id)
      );

      if (entityRegEntities.length === domainEntities.length) {
        return domainEntities.length;
      }

      const entityIds = new Set<string>(
        entityRegEntities.map((reg) => reg.entity_id)
      );

      for (const entity of domainEntities) {
        entityIds.add(entity);
      }

      return entityIds.size;
    }
  );

  private _getDevices = memoizeOne(
    (
      configEntry: ConfigEntryExtended[],
      deviceRegistryEntries: HomeAssistant["devices"]
    ): DeviceRegistryEntry[] => {
      if (!deviceRegistryEntries) {
        return [];
      }
      const entryIds = configEntry.map((entry) => entry.entry_id);
      return Object.values(deviceRegistryEntries).filter((device) =>
        device.config_entries.some((entryId) => entryIds.includes(entryId))
      );
    }
  );

  static styles = css`
    :host {
      display: block;
    }
    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: var(--ha-border-width-sm) solid
        var(--ha-color-border-neutral-quiet);
      padding-top: var(--ha-space-2);
    }
    .count-badge {
      color: var(--ha-color-text-secondary);
      font-size: var(--ha-font-size-m);
    }
    .icons {
      display: flex;
      margin-inline-start: auto;
    }
    .icon {
      color: var(--label-badge-grey);
      padding: 4px;
      margin-left: 8px;
      margin-inline-start: 8px;
      margin-inline-end: initial;
    }
    .icon.custom {
      color: var(--warning-color);
    }
    .icon.overwrites {
      color: var(--error-color);
    }
    .icon ha-svg-icon {
      width: 24px;
      height: 24px;
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-integration-card-footer": HaIntegrationCardFooter;
  }
}
