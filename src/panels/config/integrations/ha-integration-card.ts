import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import "@material/mwc-button";
import "@material/mwc-list";
import {
  mdiCogOutline,
  mdiDevices,
  mdiHandExtendedOutline,
  mdiPuzzleOutline,
  mdiShapeOutline,
} from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-next";
import "../../../components/ha-list-item";
import "../../../components/ha-svg-icon";
import { ConfigEntry, ERROR_STATES } from "../../../data/config_entries";
import type { DeviceRegistryEntry } from "../../../data/device_registry";
import type { EntityRegistryEntry } from "../../../data/entity_registry";
import {
  IntegrationLogInfo,
  IntegrationManifest,
  LogSeverity,
} from "../../../data/integration";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { ConfigEntryExtended } from "./ha-config-integrations";
import "./ha-integration-header";

@customElement("ha-integration-card")
export class HaIntegrationCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public domain!: string;

  @property({ attribute: false }) public items!: ConfigEntryExtended[];

  @property({ attribute: false }) public manifest?: IntegrationManifest;

  @property({ attribute: false })
  public entityRegistryEntries!: EntityRegistryEntry[];

  @property({ type: Boolean }) public supportsDiagnostics = false;

  @property() public logInfo?: IntegrationLogInfo;

  protected render(): TemplateResult {
    const state = this._getState(this.items);

    const debugLoggingEnabled =
      this.logInfo && this.logInfo.level === LogSeverity.DEBUG;

    return html`
      <ha-card
        outlined
        class=${classMap({
          "state-loaded": state === "loaded",
          "state-not-loaded": state === "not_loaded",
          "state-failed-unload": state === "failed_unload",
          "state-setup": state === "setup_in_progress",
          "state-error": ERROR_STATES.includes(state),
          "debug-logging": Boolean(debugLoggingEnabled),
        })}
      >
        <a href=${`/config/integrations/integration/${this.domain}`}>
          <ha-integration-header
            .hass=${this.hass}
            .domain=${this.domain}
            .localizedDomainName=${this.items[0].localized_domain_name}
            .banner=${state !== "loaded"
              ? this.hass.localize(
                  `ui.panel.config.integrations.config_entry.state.${state}`
                )
              : debugLoggingEnabled
              ? this.hass.localize(
                  "ui.panel.config.integrations.config_entry.debug_logging_enabled"
                )
              : undefined}
            .manifest=${this.manifest}
          >
            <ha-icon-button
              slot="header-button"
              .label=${this.hass.localize(
                "ui.panel.config.integrations.config_entry.configure"
              )}
              .path=${mdiCogOutline}
            ></ha-icon-button>
          </ha-integration-header>
        </a>

        ${this._renderSingleEntry()}
      </ha-card>
    `;
  }

  private _renderSingleEntry(): TemplateResult {
    const devices = this._getDevices(this.items, this.hass.devices);
    const entities = devices.length
      ? []
      : this._getEntities(this.items, this.entityRegistryEntries);

    const services = !devices.some((device) => device.entry_type !== "service");

    return html`
      <div class="content">
        ${devices.length > 0
          ? html`<a
              href=${devices.length === 1
                ? `/config/devices/device/${devices[0].id}`
                : `/config/devices/dashboard?historyBack=1&domain=${this.domain}`}
            >
              <ha-list-item hasMeta graphic="icon">
                <ha-svg-icon
                  .path=${services ? mdiHandExtendedOutline : mdiDevices}
                  slot="graphic"
                ></ha-svg-icon>
                ${this.hass.localize(
                  `ui.panel.config.integrations.config_entry.${
                    services ? "services" : "devices"
                  }`,
                  "count",
                  devices.length
                )}
                <ha-icon-next slot="meta"></ha-icon-next>
              </ha-list-item>
            </a>`
          : entities.length > 0
          ? html`<a
              href=${`/config/entities?historyBack=1&domain=${this.domain}`}
            >
              <ha-list-item hasMeta graphic="icon">
                <ha-svg-icon
                  .path=${mdiShapeOutline}
                  slot="graphic"
                ></ha-svg-icon>
                ${this.hass.localize(
                  `ui.panel.config.integrations.config_entry.entities`,
                  "count",
                  entities.length
                )}
                <ha-icon-next slot="meta"></ha-icon-next>
              </ha-list-item>
            </a>`
          : html`<a href=${`/config/integrations/integration/${this.domain}`}>
              <ha-list-item hasMeta graphic="icon">
                <ha-svg-icon
                  .path=${mdiPuzzleOutline}
                  slot="graphic"
                ></ha-svg-icon>
                ${this.hass.localize(
                  `ui.panel.config.integrations.config_entry.entries`,
                  "count",
                  this.items.length
                )}
                <ha-icon-next slot="meta"></ha-icon-next>
              </ha-list-item>
            </a>`}
      </div>
    `;
  }

  private _getState = memoizeOne(
    (configEntry: ConfigEntry[]): ConfigEntry["state"] => {
      if (configEntry.length === 1) {
        return configEntry[0].state;
      }
      let state: ConfigEntry["state"];
      for (const entry of configEntry) {
        if (ERROR_STATES.includes(entry.state)) {
          return entry.state;
        }
        state = entry.state;
      }
      return state!;
    }
  );

  private _getEntities = memoizeOne(
    (
      configEntry: ConfigEntry[],
      entityRegistryEntries: EntityRegistryEntry[]
    ): EntityRegistryEntry[] => {
      if (!entityRegistryEntries) {
        return [];
      }
      const entryIds = configEntry.map((entry) => entry.entry_id);
      return entityRegistryEntries.filter(
        (entity) =>
          entity.config_entry_id && entryIds.includes(entity.config_entry_id)
      );
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

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          --state-color: var(--divider-color, #e0e0e0);
          --ha-card-border-color: var(--state-color);
          --state-message-color: var(--state-color);
        }
        .debug-logging {
          --state-color: var(--warning-color);
          --text-on-state-color: var(--primary-text-color);
        }
        .state-error {
          --state-color: var(--error-color);
          --text-on-state-color: var(--text-primary-color);
        }
        .state-failed-unload {
          --state-color: var(--warning-color);
          --text-on-state-color: var(--primary-text-color);
        }
        .state-not-loaded {
          --state-message-color: var(--primary-text-color);
        }
        .state-setup {
          --state-message-color: var(--secondary-text-color);
        }
        :host(.highlight) ha-card {
          --state-color: var(--primary-color);
          --text-on-state-color: var(--text-primary-color);
        }
        .content {
          flex: 1;
          --mdc-list-side-padding-right: 20px;
          --mdc-list-side-padding-left: 24px;
          --mdc-list-item-graphic-margin: 24px;
        }
        a {
          text-decoration: none;
          color: var(--primary-text-color);
        }
        a ha-icon-button {
          color: var(--secondary-text-color);
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
