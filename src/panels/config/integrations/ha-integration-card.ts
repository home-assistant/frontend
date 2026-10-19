import type { ContextType } from "@lit/context";
import {
  mdiAlertCircle,
  mdiBugOutline,
  mdiFileCodeOutline,
  mdiPackageVariant,
  mdiWeb,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { consume } from "../../../common/decorators/consume";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-card";
import "../../../components/ha-ripple";
import "../../../components/ha-spinner";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import "../../../components/item/ha-row-item";
import type { ConfigEntry } from "../../../data/config_entries";
import { ERROR_STATES } from "../../../data/config_entries";
import {
  configContext,
  devicesContext,
  uiContext,
} from "../../../data/context";
import type { DeviceRegistryEntry } from "../../../data/device/device_registry";
import type { EntityRegistryEntry } from "../../../data/entity/entity_registry";
import type {
  IntegrationLogInfo,
  IntegrationManifest,
} from "../../../data/integration";
import { domainToName, LogSeverity } from "../../../data/integration";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistantConfig, HomeAssistantUI } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import type { ConfigEntryExtended } from "./ha-config-integrations";
import type { IntegrationCardSummary } from "./integration-card-summary";
import {
  computeIntegrationCardState,
  computeIntegrationCardSummary,
} from "./integration-card-summary";

interface IntegrationCardStatus {
  level: "error" | "warning" | "progress";
  /** Icon path; omitted for "progress", which shows a spinner. */
  icon?: string;
  message: string;
}

// Status shown for card states that need attention or are in progress.
const STATE_STATUS: Partial<
  Record<ConfigEntry["state"], Omit<IntegrationCardStatus, "message">>
> = {
  setup_error: { level: "error", icon: mdiAlertCircle },
  setup_retry: { level: "error", icon: mdiAlertCircle },
  migration_error: { level: "error", icon: mdiAlertCircle },
  not_loaded: { level: "warning", icon: mdiAlertCircle },
  failed_unload: { level: "warning", icon: mdiAlertCircle },
  setup_in_progress: { level: "progress" },
  unload_in_progress: { level: "progress" },
};

@customElement("ha-integration-card")
export class HaIntegrationCard extends LitElement {
  @property() public domain!: string;

  @property({ attribute: false }) public items!: ConfigEntryExtended[];

  @property({ attribute: false }) public manifest?: IntegrationManifest;

  @property({ attribute: false })
  public entityRegistryEntries!: EntityRegistryEntry[];

  @property({ attribute: false }) public logInfo?: IntegrationLogInfo;

  @property({ attribute: false }) public domainEntities: string[] = [];

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: devicesContext, subscribe: true })
  private _devices!: ContextType<typeof devicesContext>;

  @state()
  @consume({ context: uiContext, subscribe: true })
  @transform<HomeAssistantUI, boolean | undefined>({
    transformer: ({ themes }) => themes?.darkMode,
  })
  private _darkMode?: boolean;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, string>({
    transformer: ({ auth }) => auth.data.hassUrl,
  })
  private _hassUrl!: string;

  // There is no hover on touch devices, so a tap on a tooltip anchor shows
  // the tooltip instead of following the card link.
  private _lastPointerType?: string;

  protected render(): TemplateResult {
    const entryState = computeIntegrationCardState(this.items);
    const isError = ERROR_STATES.includes(entryState);
    const debugLoggingEnabled = this.logInfo?.level === LogSeverity.DEBUG;

    const status = this._computeStatus(entryState, debugLoggingEnabled);

    const domainName =
      this.items[0].localized_domain_name ||
      domainToName(this._localize, this.domain, this.manifest);

    return html`
      <ha-card
        outlined
        class=${classMap({
          "state-not-loaded": entryState === "not_loaded",
          "all-not-loaded": this.items.every(
            (entry) => entry.state === "not_loaded"
          ),
          "state-failed-unload": entryState === "failed_unload",
          "state-error": isError,
          "debug-logging": debugLoggingEnabled,
        })}
      >
        <a
          href=${`/config/integrations/integration/${this.domain}`}
          class="ripple-anchor"
        >
          <ha-ripple></ha-ripple>
          <ha-row-item>
            <img
              slot="start"
              alt=""
              src=${brandsUrl(
                {
                  domain: this.domain,
                  type: "icon",
                  darkOptimized: this._darkMode,
                },
                this._hassUrl
              )}
              crossorigin="anonymous"
              referrerpolicy="no-referrer"
              @error=${this._onImageError}
              @load=${this._onImageLoad}
            />
            <span slot="headline" class="name" role="heading" aria-level="1"
              >${domainName}</span
            >
            ${this._renderSupportingText(status)}
          </ha-row-item>
        </a>
      </ha-card>
    `;
  }

  private _computeStatus(
    entryState: ConfigEntry["state"],
    debugLoggingEnabled: boolean
  ): IntegrationCardStatus | undefined {
    const stateStatus = STATE_STATUS[entryState];
    if (stateStatus) {
      return {
        ...stateStatus,
        message: this._localize(
          `ui.panel.config.integrations.config_entry.state.${entryState}`
        ),
      };
    }
    if (debugLoggingEnabled) {
      return {
        level: "warning",
        icon: mdiBugOutline,
        message: this._localize(
          "ui.panel.config.integrations.config_entry.debug_logging_enabled"
        ),
      };
    }
    return undefined;
  }

  private _computeSupportingText(
    summary?: IntegrationCardSummary,
    status?: IntegrationCardStatus
  ): string | undefined {
    if (!summary) {
      return status?.message;
    }
    if (!summary.attention) {
      return this._localize(
        `ui.panel.config.integrations.config_entry.${summary.unit}`,
        { count: summary.count }
      );
    }
    const attentionState = summary.attentionState ?? "other";
    if (summary.attention >= summary.count) {
      return this._localize(
        `ui.panel.config.integrations.config_entry.attention.${summary.unit}_all`,
        { count: summary.count, state: attentionState }
      );
    }
    return this._localize(
      `ui.panel.config.integrations.config_entry.attention.${summary.unit}_some`,
      {
        count: summary.count,
        attention: summary.attention,
        state: attentionState,
      }
    );
  }

  private _renderSupportingText(
    status?: IntegrationCardStatus
  ): TemplateResult | typeof nothing {
    const devices = this._getDevices(this.items, this._devices);
    const summary = computeIntegrationCardSummary(
      this.items,
      devices,
      this.entityRegistryEntries,
      devices.length
        ? 0
        : this._getEntityCount(
            this.items,
            this.entityRegistryEntries,
            this.domainEntities
          )
    );

    const icons = this._renderIcons();

    if (!summary && !status && icons === nothing) {
      return nothing;
    }

    const text = this._computeSupportingText(summary, status);

    return html`<span slot="supporting-text" class="supporting-text">
      ${
        status
          ? html`<span
                id="status"
                class="status status-${status.level}"
                @pointerdown=${this._handleTooltipPointerDown}
                @click=${this._handleTooltipClick}
              >
                ${
                  status.icon
                    ? html`<ha-svg-icon
                        .path=${status.icon}
                        role="img"
                        aria-label=${status.message}
                      ></ha-svg-icon>`
                    : html`<ha-spinner
                        size="tiny"
                        role="img"
                        aria-label=${status.message}
                      ></ha-spinner>`
                }
                ${text ? html`<span class="text">${text}</span>` : nothing}
              </span>
              <ha-tooltip for="status" trigger="hover focus click"
                >${status.message}</ha-tooltip
              >`
          : text
            ? html`<span class="text">${text}</span>`
            : nothing
      }
      ${icons}
    </span>`;
  }

  private _renderIcons(): TemplateResult | typeof nothing {
    const manifest = this.manifest;
    if (!manifest) {
      return nothing;
    }

    const isCustom = !manifest.is_built_in;
    const isCloud = Boolean(manifest.iot_class?.startsWith("cloud_"));
    const isYaml =
      !manifest.config_flow &&
      !this.items.every((itm) => itm.source === "system");

    if (!isCustom && !isCloud && !isYaml) {
      return nothing;
    }

    return html`
      <span class="icons">
        ${
          isCustom
            ? this._renderIcon(
                "icon-custom",
                mdiPackageVariant,
                this._localize(
                  manifest.overwrites_built_in
                    ? "ui.panel.config.integrations.config_entry.custom_overwrites_core"
                    : "ui.panel.config.integrations.config_entry.custom_integration"
                ),
                manifest.overwrites_built_in ? "overwrites" : "custom"
              )
            : nothing
        }
        ${
          isCloud
            ? this._renderIcon(
                "icon-cloud",
                mdiWeb,
                this._localize(
                  "ui.panel.config.integrations.config_entry.depends_on_cloud"
                )
              )
            : nothing
        }
        ${
          isYaml
            ? this._renderIcon(
                "icon-yaml",
                mdiFileCodeOutline,
                this._localize(
                  "ui.panel.config.integrations.config_entry.no_config_flow"
                )
              )
            : nothing
        }
      </span>
    `;
  }

  private _renderIcon(
    id: string,
    path: string,
    label: string,
    className = ""
  ): TemplateResult {
    return html`<span
        id=${id}
        class="icon ${className}"
        role="img"
        aria-label=${label}
        @pointerdown=${this._handleTooltipPointerDown}
        @click=${this._handleTooltipClick}
      >
        <ha-svg-icon .path=${path}></ha-svg-icon>
      </span>
      <ha-tooltip for=${id} trigger="hover focus click">${label}</ha-tooltip>`;
  }

  private _handleTooltipPointerDown(ev: PointerEvent) {
    this._lastPointerType = ev.pointerType;
  }

  private _handleTooltipClick(ev: MouseEvent) {
    if (this._lastPointerType !== "touch") {
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
  }

  private _onImageLoad(ev: Event) {
    (ev.target as HTMLImageElement).style.visibility = "initial";
  }

  private _onImageError(ev: Event) {
    (ev.target as HTMLImageElement).style.visibility = "hidden";
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
      deviceRegistryEntries: ContextType<typeof devicesContext>
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

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          cursor: pointer;
          --state-color: var(--divider-color, #e0e0e0);
        }
        ha-card:hover {
          background-color: var(--ha-color-fill-neutral-quiet-resting);
        }
        .ripple-anchor {
          display: flex;
          flex-direction: column;
          flex: 1;
          position: relative;
          outline: none;
          /* ha-ripple adds a hover overlay that conflicts with ha-card:hover background change;
             neutralize it so hover matches the apps card (background-color only) */
          --ha-ripple-hover-color: transparent;
        }
        .ripple-anchor:focus-visible:before {
          position: absolute;
          display: block;
          content: "";
          inset: 0;
          background-color: var(--secondary-text-color);
          opacity: 0.08;
        }
        ha-row-item {
          flex: 1;
          display: flex;
          --ha-row-item-padding-block: var(--ha-space-4);
          --ha-row-item-padding-inline: var(--ha-space-4);
          --ha-row-item-gap: var(--ha-space-4);
        }
        /* Fill the card height so content stays centered when a neighboring
           card in the grid row is taller */
        ha-row-item::part(base) {
          flex: 1;
          min-width: 0;
        }
        ha-row-item::part(headline) {
          font-size: var(--ha-font-size-l);
        }
        .name {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        img {
          width: 40px;
          height: 40px;
        }
        .supporting-text {
          display: flex;
          align-items: center;
          gap: var(--ha-space-1);
          min-height: calc(
            var(--ha-font-size-s) * var(--ha-line-height-normal)
          );
        }
        .supporting-text .text,
        .status .text {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .status {
          display: flex;
          align-items: center;
          gap: var(--ha-space-1);
          min-width: 0;
          line-height: 16px;
        }
        .status ha-svg-icon,
        .status ha-spinner {
          flex-shrink: 0;
          --mdc-icon-size: 16px;
        }
        .status ha-spinner {
          --track-width: 2px;
        }
        .status-error ha-svg-icon {
          color: var(--error-color);
        }
        .status-warning ha-svg-icon {
          color: var(--warning-color);
        }
        .icons {
          display: flex;
          flex-shrink: 0;
          gap: var(--ha-space-1);
          margin-inline-start: auto;
          padding-inline-start: var(--ha-space-1);
        }
        .icon {
          display: flex;
          color: var(--label-badge-grey);
          --mdc-icon-size: 16px;
        }
        .icon.custom {
          color: var(--warning-color);
        }
        .icon.overwrites {
          color: var(--error-color);
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
          --state-color: var(--warning-color);
          --ha-card-border-color: var(--state-color);
        }
        .all-not-loaded {
          opacity: 0.8;
        }
        :host(.highlight) ha-card {
          --state-color: var(--primary-color);
          --ha-card-border-color: var(--state-color);
        }
        a {
          text-decoration: none;
          color: var(--primary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-integration-card": HaIntegrationCard;
  }
}
