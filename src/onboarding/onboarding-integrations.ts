import "@material/mwc-button/mwc-button";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { fireEvent } from "../common/dom/fire_event";
import { stringCompare } from "../common/string/compare";
import { LocalizeFunc } from "../common/translations/localize";
import { ConfigEntry, subscribeConfigEntries } from "../data/config_entries";
import { subscribeConfigFlowInProgress } from "../data/config_flow";
import { domainToName } from "../data/integration";
import { scanUSBDevices } from "../data/usb";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import { HomeAssistant } from "../types";
import "./integration-badge";
import { onBoardingStyles } from "./styles";

const HIDDEN_DOMAINS = new Set([
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

  @property() public onboardingLocalize!: LocalizeFunc;

  @state() private _entries: ConfigEntry[] = [];

  @state() private _discoveredDomains?: Set<string>;

  public hassSubscribe(): Array<UnsubscribeFunc | Promise<UnsubscribeFunc>> {
    return [
      subscribeConfigFlowInProgress(this.hass, (flows) => {
        this._discoveredDomains = new Set(
          flows
            .filter((flow) => !HIDDEN_DOMAINS.has(flow.handler))
            .map((flow) => flow.handler)
        );
        this.hass.loadBackendTranslation(
          "title",
          Array.from(this._discoveredDomains)
        );
      }),
      subscribeConfigEntries(
        this.hass,
        (messages) => {
          let fullUpdate = false;
          const newEntries: ConfigEntry[] = [];
          const integrations: Set<string> = new Set();
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
    if (!this._discoveredDomains) {
      return nothing;
    }
    // Render discovered and existing entries together sorted by localized title.
    let uniqueDomains: Set<string> = new Set();
    this._entries.forEach((entry) => {
      uniqueDomains.add(entry.domain);
    });
    uniqueDomains = new Set([...uniqueDomains, ...this._discoveredDomains]);
    let domains: Array<[string, string]> = [];
    for (const domain of uniqueDomains.values()) {
      domains.push([domain, domainToName(this.hass.localize, domain)]);
    }
    domains = domains.sort((a, b) =>
      stringCompare(a[0], b[0], this.hass.locale.language)
    );

    const foundIntegrations = domains.length;

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
        <mwc-button unelevated @click=${this._finish}>
          ${this.onboardingLocalize(
            "ui.panel.page-onboarding.integration.finish"
          )}
        </mwc-button>
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-integrations": OnboardingIntegrations;
  }
}
