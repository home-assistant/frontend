import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import "@material/mwc-ripple";
import type { Ripple } from "@material/mwc-ripple";
import { RippleHandlers } from "@material/mwc-ripple/ripple-handlers";
import { mdiCloud, mdiPackageVariant } from "@mdi/js";
import {
  CSSResultGroup,
  LitElement,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import {
  customElement,
  eventOptions,
  property,
  queryAsync,
  state,
} from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { computeRTL } from "../../../common/util/compute_rtl";
import "../../../components/ha-card";
import "../../../components/ha-button";
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

  @queryAsync("mwc-ripple") private _ripple!: Promise<Ripple | null>;

  @state() private _shouldRenderRipple = false;

  protected render(): TemplateResult {
    const entryState = this._getState(this.items);

    const debugLoggingEnabled =
      this.logInfo && this.logInfo.level === LogSeverity.DEBUG;

    return html`
      <ha-card
        outlined
        class=${classMap({
          "state-loaded": entryState === "loaded",
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
          @focus=${this.handleRippleFocus}
          @blur=${this.handleRippleBlur}
          @mouseenter=${this.handleRippleMouseEnter}
          @mouseleave=${this.handleRippleMouseLeave}
          @mousedown=${this.handleRippleActivate}
          @mouseup=${this.handleRippleDeactivate}
          @touchstart=${this.handleRippleActivate}
          @touchend=${this.handleRippleDeactivate}
          @touchcancel=${this.handleRippleDeactivate}
        >
          ${this._shouldRenderRipple ? html`<mwc-ripple></mwc-ripple>` : ""}
          <ha-integration-header
            .hass=${this.hass}
            .domain=${this.domain}
            .localizedDomainName=${this.items[0].localized_domain_name}
            .error=${ERROR_STATES.includes(entryState)
              ? this.hass.localize(
                  `ui.panel.config.integrations.config_entry.state.${entryState}`
                )
              : undefined}
            .warning=${entryState !== "loaded" &&
            !ERROR_STATES.includes(entryState)
              ? this.hass.localize(
                  `ui.panel.config.integrations.config_entry.state.${entryState}`
                )
              : debugLoggingEnabled
              ? this.hass.localize(
                  "ui.panel.config.integrations.config_entry.debug_logging_enabled"
                )
              : undefined}
            .manifest=${this.manifest}
          >
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
      <div class="card-actions">
        ${devices.length > 0
          ? html`<a
              href=${devices.length === 1
                ? `/config/devices/device/${devices[0].id}`
                : `/config/devices/dashboard?historyBack=1&domain=${this.domain}`}
            >
              <ha-button>
                ${this.hass.localize(
                  `ui.panel.config.integrations.config_entry.${
                    services ? "services" : "devices"
                  }`,
                  "count",
                  devices.length
                )}
              </ha-button>
            </a>`
          : entities.length > 0
          ? html`<a
              href=${`/config/entities?historyBack=1&domain=${this.domain}`}
            >
              <ha-button>
                ${this.hass.localize(
                  `ui.panel.config.integrations.config_entry.entities`,
                  "count",
                  entities.length
                )}
              </ha-button>
            </a>`
          : html`<a href=${`/config/integrations/integration/${this.domain}`}>
              <ha-button>
                ${this.hass.localize(
                  `ui.panel.config.integrations.config_entry.entries`,
                  "count",
                  this.items.length
                )}
              </ha-button>
            </a>`}
        <div class="icons">
          ${this.manifest && !this.manifest.is_built_in
            ? html`<span class="icon custom">
                <ha-svg-icon .path=${mdiPackageVariant}></ha-svg-icon>
                <simple-tooltip
                  animation-delay="0"
                  .position=${computeRTL(this.hass) ? "right" : "left"}
                  offset="4"
                  >${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.custom_integration"
                  )}</simple-tooltip
                >
              </span>`
            : nothing}
          ${this.manifest && this.manifest.iot_class?.startsWith("cloud_")
            ? html`<div class="icon cloud">
                <ha-svg-icon .path=${mdiCloud}></ha-svg-icon>
                <simple-tooltip
                  animation-delay="0"
                  .position=${computeRTL(this.hass) ? "right" : "left"}
                  offset="4"
                  >${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.depends_on_cloud"
                  )}</simple-tooltip
                >
              </div>`
            : nothing}
        </div>
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

  private _rippleHandlers: RippleHandlers = new RippleHandlers(() => {
    this._shouldRenderRipple = true;
    return this._ripple;
  });

  @eventOptions({ passive: true })
  private handleRippleActivate(evt?: Event) {
    this._rippleHandlers.startPress(evt);
  }

  private handleRippleDeactivate() {
    this._rippleHandlers.endPress();
  }

  private handleRippleFocus() {
    this._rippleHandlers.startFocus();
  }

  private handleRippleBlur() {
    this._rippleHandlers.endFocus();
  }

  protected handleRippleMouseEnter() {
    this._rippleHandlers.startHover();
  }

  protected handleRippleMouseLeave() {
    this._rippleHandlers.endHover();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          overflow: hidden;
          --state-color: var(--divider-color, #e0e0e0);
          --ha-card-border-color: var(--state-color);
          --state-message-color: var(--state-color);
        }
        .ripple-anchor {
          flex-grow: 1;
          position: relative;
        }
        ha-integration-header {
          height: 100%;
        }
        .card-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
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
          opacity: 0.8;
          --state-color: var(--warning-color);
          --state-message-color: var(--primary-text-color);
        }
        .state-setup {
          opacity: 0.8;
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
        .icons {
          display: flex;
        }
        .icon {
          border-radius: 50%;
          color: var(--text-primary-color);
          padding: 4px;
          margin-left: 8px;
        }
        .icon.cloud {
          background: var(--info-color);
        }
        .icon.custom {
          background: var(--warning-color);
        }
        .icon ha-svg-icon {
          width: 16px;
          height: 16px;
          display: block;
        }
        simple-tooltip {
          white-space: nowrap;
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
