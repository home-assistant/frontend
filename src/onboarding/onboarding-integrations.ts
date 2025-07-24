import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { fireEvent } from "../common/dom/fire_event";
import { stringCompare } from "../common/string/compare";
import type { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-button";
import type { ConfigEntry } from "../data/config_entries";
import { subscribeConfigEntries } from "../data/config_entries";
import { subscribeConfigFlowInProgress } from "../data/config_flow";
import { domainToName } from "../data/integration";
import { scanUSBDevices } from "../data/usb";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import type { HomeAssistant } from "../types";
import "./integration-badge";
import { onBoardingStyles } from "./styles";

const HIDDEN_DOMAINS = new Set([
  "backup",
  "google_translate",
  "hassio",
  "met",
  "radio_browser",
  "rpi_power",
  "shopping_list",
  "sun",
]);

@customElement("onboarding-integrations")
class OnboardingIntegrations extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public onboardingLocalize!: LocalizeFunc;

  @state() private _entries: ConfigEntry[] = [];

  @state() private _discoveredDomains: Set<string> = new Set<string>();

  @state() private _discoveredDomainsReceived = false;

  public hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [
      subscribeConfigFlowInProgress(this.hass, (messages) => {
        messages.forEach((message) => {
          if (
            message.type === "removed" ||
            HIDDEN_DOMAINS.has(message.flow.handler)
          ) {
            return;
          }
          this._discoveredDomains.add(message.flow.handler);
        });
        this.hass.loadBackendTranslation(
          "title",
          Array.from(this._discoveredDomains)
        );
        this._discoveredDomainsReceived = true;
      }),
      subscribeConfigEntries(
        this.hass,
        (messages) => {
          let fullUpdate = false;
          const newEntries: ConfigEntry[] = [];
          const integrations = new Set<string>();
          messages.forEach((message) => {
            if (message.type === null || message.type === "added") {
              if (HIDDEN_DOMAINS.has(message.entry.domain)) {
                return;
              }
              newEntries.push(message.entry);
              integrations.add(message.entry.domain);
              if (message.type === null) {
                fullUpdate = true;
              }
            } else if (message.type === "removed") {
              this._entries = this._entries!.filter(
                (entry) => entry.entry_id !== message.entry.entry_id
              );
            } else if (message.type === "updated") {
              if (HIDDEN_DOMAINS.has(message.entry.domain)) {
                return;
              }
              const newEntry = message.entry;
              this._entries = this._entries!.map((entry) =>
                entry.entry_id === newEntry.entry_id ? newEntry : entry
              );
            }
          });
          if (!newEntries.length && !fullUpdate) {
            return;
          }
          this.hass.loadBackendTranslation("title", Array.from(integrations));
          const existingEntries = fullUpdate ? [] : this._entries;
          this._entries = [...existingEntries!, ...newEntries];
        },
        { type: ["device", "hub", "service"] }
      ),
    ];
  }

  protected render() {
    if (!this._discoveredDomainsReceived) {
      return nothing;
    }
    // Render discovered and existing entries together sorted by localized title.
    let uniqueDomains = new Set<string>();
    this._entries.forEach((entry) => {
      uniqueDomains.add(entry.domain);
    });
    uniqueDomains = new Set([...uniqueDomains, ...this._discoveredDomains]);
    let domains: [string, string][] = [];
    for (const domain of uniqueDomains.values()) {
      domains.push([domain, domainToName(this.hass.localize, domain)]);
    }
    domains = domains.sort((a, b) =>
      stringCompare(a[0], b[0], this.hass.locale.language)
    );

    const foundIntegrations = domains.length;

    // there is a possibility that the user has no integrations
    if (foundIntegrations === 0) {
      return html`
        <div class="all-set-icon">🎉</div>
        <h1>
          ${this.onboardingLocalize(
            "ui.panel.page-onboarding.integration.all_set"
          )}
        </h1>
        <p>
          ${this.onboardingLocalize(
            "ui.panel.page-onboarding.integration.lets_start"
          )}
        </p>
        <div class="footer">
          <ha-button unelevated @click=${this._finish}>
            ${this.onboardingLocalize(
              "ui.panel.page-onboarding.integration.finish"
            )}
          </ha-button>
        </div>
      `;
    }

    if (domains.length > 12) {
      domains = domains.slice(0, 11);
    }

    return html`
      <h1>
        ${this.onboardingLocalize(
          "ui.panel.page-onboarding.integration.header"
        )}
      </h1>
      <p>
        ${this.onboardingLocalize("ui.panel.page-onboarding.integration.intro")}
      </p>
      <div class="badges">
        ${domains.map(
          ([domain, title]) =>
            html`<integration-badge
              .domain=${domain}
              .title=${title}
              .darkOptimizedIcon=${this.hass.themes?.darkMode}
            ></integration-badge>`
        )}
        ${foundIntegrations > domains.length
          ? html`<div class="more">
              ${this.onboardingLocalize(
                "ui.panel.page-onboarding.integration.more_integrations",
                { count: foundIntegrations - domains.length }
              )}
            </div>`
          : nothing}
      </div>
      <div class="footer">
        <ha-button unelevated @click=${this._finish}>
          ${this.onboardingLocalize(
            "ui.panel.page-onboarding.integration.finish"
          )}
        </ha-button>
      </div>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.hass.loadBackendTranslation("title");
    this._scanUSBDevices();
  }

  private async _scanUSBDevices() {
    if (!isComponentLoaded(this.hass, "usb")) {
      return;
    }
    await scanUSBDevices(this.hass);
  }

  private async _finish() {
    fireEvent(this, "onboarding-step", {
      type: "integration",
    });
  }

  static get styles(): CSSResultGroup {
    return [
      onBoardingStyles,
      css`
        .badges {
          margin-top: 24px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(106px, 1fr));
          row-gap: 24px;
        }
        .more {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
        }
        .all-set-icon {
          font-size: 64px;
          text-align: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-integrations": OnboardingIntegrations;
  }
}
