import type { ContextType } from "@lit/context";
import {
  mdiExclamationThick,
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
import { computeRTL } from "../../../common/util/compute_rtl";
import "../../../components/ha-card";
import "../../../components/ha-ripple";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import "../../../components/item/ha-row-item";
import type { ConfigEntry } from "../../../data/config_entries";
import { ERROR_STATES } from "../../../data/config_entries";
import {
  configContext,
  devicesContext,
  internationalizationContext,
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
import type {
  HomeAssistantConfig,
  HomeAssistantInternationalization,
  HomeAssistantUI,
} from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import type { ConfigEntryExtended } from "./ha-config-integrations";
import { computeIntegrationCardSummary } from "./integration-card-summary";

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

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  @transform<HomeAssistantInternationalization, boolean>({
    transformer: ({ language, translationMetadata }) =>
      computeRTL(language, translationMetadata.translations),
  })
  private _isRTL!: boolean;

  protected render(): TemplateResult {
    const entryState = this._getState(this.items);
    const isError = ERROR_STATES.includes(entryState);
    const debugLoggingEnabled = this.logInfo?.level === LogSeverity.DEBUG;

    let status: { level: "error" | "warning"; message: string } | undefined;
    if (isError) {
      status = {
        level: "error",
        message: this._localize(
          `ui.panel.config.integrations.config_entry.state.${entryState}`
        ),
      };
    } else if (entryState === "not_loaded" || entryState === "failed_unload") {
      status = {
        level: "warning",
        message: this._localize(
          `ui.panel.config.integrations.config_entry.state.${entryState}`
        ),
      };
    } else if (debugLoggingEnabled) {
      status = {
        level: "warning",
        message: this._localize(
          "ui.panel.config.integrations.config_entry.debug_logging_enabled"
        ),
      };
    }

    const domainName =
      this.items[0].localized_domain_name ||
      domainToName(this._localize, this.domain, this.manifest);

    return html`
      <ha-card
        outlined
        class=${classMap({
          "state-not-loaded": entryState === "not_loaded",
          "state-failed-unload": entryState === "failed_unload",
          "state-setup": entryState === "setup_in_progress",
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
            <div slot="start" class="icon-wrapper">
              <img
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
              ${
                status
                  ? html`<span id="status-badge" class="badge ${status.level}">
                        <ha-svg-icon .path=${mdiExclamationThick}></ha-svg-icon>
                      </span>
                      <ha-tooltip for="status-badge"
                        >${status.message}</ha-tooltip
                      >`
                  : nothing
              }
            </div>
            <span slot="headline" role="heading" aria-level="1"
              >${domainName}</span
            >
            ${this._renderSupportingText()} ${this._renderIcons()}
          </ha-row-item>
        </a>
      </ha-card>
    `;
  }

  private _renderSupportingText(): TemplateResult | typeof nothing {
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

    if (!summary) {
      return nothing;
    }

    const { unit, count, attention } = summary;

    let text: string;
    if (!attention) {
      text = this._localize(
        `ui.panel.config.integrations.config_entry.${unit}`,
        { count }
      );
    } else if (attention >= count) {
      text = this._localize(
        `ui.panel.config.integrations.config_entry.attention.${unit}_all`,
        { count }
      );
    } else {
      text = this._localize(
        `ui.panel.config.integrations.config_entry.attention.${unit}_some`,
        { count, attention }
      );
    }

    return html`<span slot="supporting-text">${text}</span>`;
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

    const placement = this._isRTL ? "right" : "left";

    return html`
      <div slot="end" class="icons">
        ${
          isCustom
            ? html`<span
                  id="icon-custom"
                  class="icon ${manifest.overwrites_built_in ? "overwrites" : "custom"}"
                >
                  <ha-svg-icon .path=${mdiPackageVariant}></ha-svg-icon>
                </span>
                <ha-tooltip for="icon-custom" .placement=${placement}>
                  ${this._localize(
                    manifest.overwrites_built_in
                      ? "ui.panel.config.integrations.config_entry.custom_overwrites_core"
                      : "ui.panel.config.integrations.config_entry.custom_integration"
                  )}
                </ha-tooltip>`
            : nothing
        }
        ${
          isCloud
            ? html`<span id="icon-cloud" class="icon">
                  <ha-svg-icon .path=${mdiWeb}></ha-svg-icon>
                </span>
                <ha-tooltip for="icon-cloud" .placement=${placement}>
                  ${this._localize(
                    "ui.panel.config.integrations.config_entry.depends_on_cloud"
                  )}
                </ha-tooltip>`
            : nothing
        }
        ${
          isYaml
            ? html`<span id="icon-yaml" class="icon">
                  <ha-svg-icon .path=${mdiFileCodeOutline}></ha-svg-icon>
                </span>
                <ha-tooltip for="icon-yaml" .placement=${placement}>
                  ${this._localize(
                    "ui.panel.config.integrations.config_entry.no_config_flow"
                  )}
                </ha-tooltip>`
            : nothing
        }
      </div>
    `;
  }

  private _onImageLoad(ev: Event) {
    (ev.target as HTMLImageElement).style.visibility = "initial";
  }

  private _onImageError(ev: Event) {
    (ev.target as HTMLImageElement).style.visibility = "hidden";
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
        }
        ha-row-item::part(headline) {
          white-space: normal;
          overflow-wrap: anywhere;
          font-size: var(--ha-font-size-l);
        }
        .icon-wrapper {
          position: relative;
          width: 40px;
          height: 40px;
        }
        .icon-wrapper img {
          width: 100%;
          height: 100%;
        }
        .badge {
          position: absolute;
          top: calc(var(--ha-space-1) * -1);
          inset-inline-start: calc(var(--ha-space-1) * -1);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          box-sizing: border-box;
          border: 1.5px solid currentColor;
          border-radius: var(--ha-border-radius-circle);
          background-color: var(--card-background-color);
          --mdc-icon-size: 12px;
        }
        .badge.error {
          color: var(--error-color);
        }
        .badge.warning {
          color: var(--warning-color);
        }
        .icons {
          display: flex;
          gap: var(--ha-space-2);
        }
        .icon {
          display: flex;
          padding: var(--ha-space-1);
          color: var(--label-badge-grey);
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
          opacity: 0.8;
          --state-color: var(--warning-color);
          --ha-card-border-color: var(--state-color);
        }
        .state-setup {
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
