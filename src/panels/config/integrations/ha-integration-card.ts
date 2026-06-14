import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import "../../../components/ha-card";
import "../../../components/ha-ripple";
import type { ConfigEntry } from "../../../data/config_entries";
import { ERROR_STATES } from "../../../data/config_entries";
import type { EntityRegistryEntry } from "../../../data/entity/entity_registry";
import type {
  IntegrationLogInfo,
  IntegrationManifest,
} from "../../../data/integration";
import { LogSeverity } from "../../../data/integration";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { ConfigEntryExtended } from "./ha-config-integrations";
import "./ha-integration-card-footer";
import "./ha-integration-header";

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
        >
          <ha-ripple></ha-ripple>
          <div class="card-content">
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
            ></ha-integration-header>
            <ha-integration-card-footer
              .hass=${this.hass}
              .manifest=${this.manifest}
              .items=${this.items}
              .entityRegistryEntries=${this.entityRegistryEntries}
              .domainEntities=${this.domainEntities}
            ></ha-integration-card-footer>
          </div>
        </a>
      </ha-card>
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
          --state-message-color: var(--state-color);
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
        .card-content {
          padding: var(--ha-space-4) var(--ha-space-4) var(--ha-space-2);
        }
        .debug-logging {
          --state-color: var(--warning-color);
          --ha-card-border-color: var(--state-color);
          --text-on-state-color: var(--primary-text-color);
        }
        .state-error {
          --state-color: var(--error-color);
          --ha-card-border-color: var(--state-color);
          --text-on-state-color: var(--text-primary-color);
        }
        .state-failed-unload {
          --state-color: var(--warning-color);
          --ha-card-border-color: var(--state-color);
          --text-on-state-color: var(--primary-text-color);
        }
        .state-not-loaded {
          opacity: 0.8;
          --state-color: var(--warning-color);
          --ha-card-border-color: var(--state-color);
          --state-message-color: var(--primary-text-color);
        }
        .state-setup {
          opacity: 0.8;
          --state-message-color: var(--secondary-text-color);
        }
        :host(.highlight) ha-card {
          --state-color: var(--primary-color);
          --ha-card-border-color: var(--state-color);
          --text-on-state-color: var(--text-primary-color);
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
