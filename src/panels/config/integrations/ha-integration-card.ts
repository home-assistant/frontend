import {
  mdiAlert,
  mdiArrowUpBoldCircle,
  mdiFileCodeOutline,
  mdiPackageVariant,
  mdiStop,
  mdiWeb,
} from "@mdi/js";
import type { TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeRTL } from "../../../common/util/compute_rtl";
import "../../../components/ha-card";
import "../../../components/automation/ha-automation-row-event-chip";
import "../../../components/ha-ripple";
import "../../../components/ha-spinner";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import type { ConfigEntry } from "../../../data/config_entries";
import { ERROR_STATES } from "../../../data/config_entries";
import type { DeviceRegistryEntry } from "../../../data/device/device_registry";
import type { EntityRegistryEntry } from "../../../data/entity/entity_registry";
import type {
  IntegrationLogInfo,
  IntegrationManifest,
} from "../../../data/integration";
import { LogSeverity } from "../../../data/integration";
import type { UpdateEntity } from "../../../data/update";
import { updateAvailable } from "../../../data/update";
import type { HomeAssistant } from "../../../types";
import type { ConfigEntryExtended } from "./ha-config-integrations";
import "./ha-integration-header";

// The spinner carries the "still working on it" part, so these states can use
// shorter copy than the entry rows, which have far more room.
const IN_PROGRESS_STATES = ["setup_retry", "setup_in_progress"];

@customElement("ha-integration-card")
export class HaIntegrationCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public domain!: string;

  @property({ attribute: false }) public items!: ConfigEntryExtended[];

  @property({ attribute: false }) public manifest?: IntegrationManifest;

  @property({ attribute: false })
  public entityRegistryEntries!: EntityRegistryEntry[];

  @property({ attribute: false }) public logInfo?: IntegrationLogInfo;

  @property({ attribute: false }) public domainEntities: string[] = [];

  protected render(): TemplateResult {
    const entryState = this._getState(this.items);

    const debugLoggingEnabled =
      this.logInfo && this.logInfo.level === LogSeverity.DEBUG;

    const status = this._statusLabel(entryState, debugLoggingEnabled);

    const statusVariant = ERROR_STATES.includes(entryState)
      ? "danger"
      : entryState === "not_loaded"
        ? "neutral"
        : "warning";

    const inProgress = IN_PROGRESS_STATES.includes(entryState);

    const hasUpdate = this._hasUpdate();

    return html`
      <ha-card
        outlined
        class=${classMap({
          "state-not-loaded": entryState === "not_loaded",
          "state-failed-unload": entryState === "failed_unload",
          "state-setup": entryState === "setup_in_progress",
          "state-error": ERROR_STATES.includes(entryState),
          "debug-logging": Boolean(debugLoggingEnabled),
        })}
      >
        <a
          href=${`/config/integrations/integration/${this.domain}`}
          class="ripple-anchor"
        >
          <ha-ripple></ha-ripple>
          <ha-integration-header
            .hass=${this.hass}
            .domain=${this.domain}
            .localizedDomainName=${this.items[0].localized_domain_name}
            .info=${this._counts()}
            .status=${status}
            .statusVariant=${status ? statusVariant : undefined}
            .manifest=${this.manifest}
          >
            ${this._renderIndicators(
              status,
              statusVariant,
              entryState,
              inProgress,
              hasUpdate
            )}
          </ha-integration-header>
        </a>
      </ha-card>
    `;
  }

  private _statusLabel(
    entryState: ConfigEntry["state"],
    debugLoggingEnabled?: boolean
  ): string | undefined {
    if (entryState === "setup_error") {
      return this.hass.localize(
        "ui.panel.config.integrations.config_entry.failed"
      );
    }
    if (entryState === "setup_retry") {
      return this.hass.localize(
        "ui.panel.config.integrations.config_entry.failed_retrying"
      );
    }
    if (entryState !== "loaded") {
      return this.hass.localize(
        `ui.panel.config.integrations.config_entry.state.${entryState}`
      );
    }
    if (debugLoggingEnabled) {
      return this.hass.localize(
        "ui.panel.config.integrations.config_entry.debug_logging_enabled"
      );
    }
    return undefined;
  }

  private _hasUpdate(): boolean {
    return this.domainEntities.some((entityId) => {
      if (computeDomain(entityId) !== "update") {
        return false;
      }
      const stateObj = this.hass.states[entityId] as UpdateEntity | undefined;
      return !!stateObj && updateAvailable(stateObj);
    });
  }

  private _counts(): string | undefined {
    const devices = this._getDevices(this.items, this.hass.devices);

    if (devices.length) {
      const services = !devices.some(
        (device) => device.entry_type !== "service"
      );
      return this.hass.localize(
        `ui.panel.config.integrations.config_entry.${
          services ? "services" : "devices"
        }`,
        { count: devices.length }
      );
    }

    const entitiesCount = this._getEntityCount(
      this.items,
      this.entityRegistryEntries,
      this.domainEntities
    );

    if (entitiesCount) {
      return this.hass.localize(
        "ui.panel.config.integrations.config_entry.entities",
        { count: entitiesCount }
      );
    }

    const entries = this.items.filter((itm) => itm.source !== "yaml");

    if (entries.length) {
      return this.hass.localize(
        "ui.panel.config.integrations.config_entry.entries",
        { count: entries.length }
      );
    }

    return undefined;
  }

  private _renderIndicators(
    status: string | undefined,
    statusVariant: "danger" | "neutral" | "warning",
    entryState: ConfigEntry["state"],
    inProgress: boolean,
    hasUpdate: boolean
  ) {
    const updateLabel = this.hass.localize(
      "ui.panel.config.integrations.config_entry.update_available"
    );

    const tooltipPlacement = computeRTL(
      this.hass.language,
      this.hass.translationMetadata.translations
    )
      ? "right"
      : "left";

    const custom = Boolean(this.manifest && !this.manifest.is_built_in);
    const cloud = Boolean(this.manifest?.iot_class?.startsWith("cloud_"));
    const yaml = Boolean(
      this.manifest &&
      !this.manifest.config_flow &&
      !this.items.every((itm) => itm.source === "system")
    );

    return html`
      <div class="indicators" slot="icons">
        ${
          custom || cloud || yaml
            ? html`<div class="icons">
                ${
                  custom
                    ? html`<span
                        class="icon ${
                          this.manifest!.overwrites_built_in
                            ? "overwrites"
                            : "custom"
                        }"
                      >
                        <ha-svg-icon
                          id="icon-custom"
                          .path=${mdiPackageVariant}
                        ></ha-svg-icon>
                        <ha-tooltip
                          for="icon-custom"
                          .placement=${tooltipPlacement}
                        >
                          ${this.hass.localize(
                            this.manifest!.overwrites_built_in
                              ? "ui.panel.config.integrations.config_entry.custom_overwrites_core"
                              : "ui.panel.config.integrations.config_entry.custom_integration"
                          )}
                        </ha-tooltip>
                      </span>`
                    : nothing
                }
                ${
                  cloud
                    ? html`<div class="icon cloud">
                        <ha-svg-icon
                          id="icon-cloud"
                          .path=${mdiWeb}
                        ></ha-svg-icon>
                        <ha-tooltip
                          for="icon-cloud"
                          .placement=${tooltipPlacement}
                        >
                          ${this.hass.localize(
                            "ui.panel.config.integrations.config_entry.depends_on_cloud"
                          )}
                        </ha-tooltip>
                      </div>`
                    : nothing
                }
                ${
                  yaml
                    ? html`<div class="icon yaml">
                        <ha-svg-icon
                          id="icon-yaml"
                          .path=${mdiFileCodeOutline}
                        ></ha-svg-icon>
                        <ha-tooltip
                          for="icon-yaml"
                          .placement=${tooltipPlacement}
                        >
                          ${this.hass.localize(
                            "ui.panel.config.integrations.config_entry.no_config_flow"
                          )}
                        </ha-tooltip>
                      </div>`
                    : nothing
                }
              </div>`
            : nothing
        }
        ${
          status
            ? html`<ha-automation-row-event-chip
                show
                .variant=${statusVariant}
                aria-label=${status}
              >
                <ha-svg-icon
                  .path=${entryState === "not_loaded" ? mdiStop : mdiAlert}
                ></ha-svg-icon>
                ${
                  inProgress
                    ? html`<ha-spinner size="tiny"></ha-spinner>`
                    : nothing
                }
              </ha-automation-row-event-chip>`
            : nothing
        }
        ${
          hasUpdate
            ? html`<ha-automation-row-event-chip
                  id="chip-update"
                  show
                  aria-label=${updateLabel}
                >
                  <ha-svg-icon .path=${mdiArrowUpBoldCircle}></ha-svg-icon>
                </ha-automation-row-event-chip>
                <ha-tooltip for="chip-update" .placement=${tooltipPlacement}>
                  ${updateLabel}
                </ha-tooltip>`
            : nothing
        }
      </div>
    `;
  }

  private _getState = memoizeOne(
    (configEntry: ConfigEntry[]): ConfigEntry["state"] => {
      if (configEntry.length === 1) {
        return configEntry[0].state;
      }
      let entryState: ConfigEntry["state"];
      for (const entry of configEntry) {
        if (ERROR_STATES.includes(entry.state)) {
          return entry.state;
        }
        entryState = entry.state;
      }
      return entryState!;
    }
  );

  private _getEntityCount = memoizeOne(
    (
      configEntry: ConfigEntry[],
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
      configEntry: ConfigEntry[],
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
    ha-card {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      --state-color: var(--divider-color, #e0e0e0);
    }
    .ripple-anchor {
      flex-grow: 1;
      position: relative;
      outline: none;
    }
    .ripple-anchor:focus-visible:before {
      position: absolute;
      display: block;
      content: "";
      inset: 0;
      background-color: var(--secondary-text-color);
      opacity: 0.08;
    }
    ha-integration-header {
      height: 100%;
    }
    ha-spinner {
      --ha-spinner-size: 24px;
      --ha-spinner-indicator-color: currentColor;
      --track-width: 2px;
    }
    .indicators {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
      flex-shrink: 0;
      /* keeps them right-aligned both beside the name and on their own line */
      margin-inline-start: auto;
    }
    .debug-logging {
      --state-color: var(--warning-color);
      --ha-card-border-color: var(--state-color);
    }
    .state-error {
      --state-color: var(--error-color);
      --ha-card-border-color: var(--state-color);
    }
    .state-failed-unload {
      --state-color: var(--warning-color);
      --ha-card-border-color: var(--state-color);
    }
    .state-not-loaded {
      --state-color: var(--disabled-color);
      --ha-card-border-color: var(--ha-color-border-neutral-quiet);
      background-color: var(--ha-color-surface-lower);
    }
    .state-setup {
      opacity: 0.8;
      --state-color: var(--ha-color-on-neutral-normal);
    }
    :host(.highlight) ha-card {
      --state-color: var(--primary-color);
      --ha-card-border-color: var(--state-color);
    }
    a {
      text-decoration: none;
      color: var(--primary-text-color);
    }
    .icons {
      display: flex;
    }
    .icon {
      color: var(--label-badge-grey);
      padding: 4px;
    }
    .icon.custom {
      color: var(--warning-color);
    }
    .icon.overwrites {
      color: var(--error-color);
    }
    /* the host is inline by default, whose line box adds a stray pixel of
       leading and pushes the chip above the icons */
    .indicators ha-automation-row-event-chip {
      display: flex;
    }
    /* metadata icons and both chips share one glyph size */
    .indicators ha-svg-icon {
      width: 24px;
      height: 24px;
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-integration-card": HaIntegrationCard;
  }
}
