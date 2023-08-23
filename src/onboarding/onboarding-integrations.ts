import "@material/mwc-button/mwc-button";
import { mdiCheck, mdiDotsHorizontal } from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { fireEvent } from "../common/dom/fire_event";
import { stringCompare } from "../common/string/compare";
import { LocalizeFunc } from "../common/translations/localize";
import { ConfigEntry, subscribeConfigEntries } from "../data/config_entries";
import {
  getConfigFlowInProgressCollection,
  localizeConfigFlowTitle,
  subscribeConfigFlowInProgress,
} from "../data/config_flow";
import { DataEntryFlowProgress } from "../data/data_entry_flow";
import { domainToName } from "../data/integration";
import { scanUSBDevices } from "../data/usb";
import {
  loadConfigFlowDialog,
  showConfigFlowDialog,
} from "../dialogs/config-flow/show-dialog-config-flow";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import { showAddIntegrationDialog } from "../panels/config/integrations/show-add-integration-dialog";
import { HomeAssistant } from "../types";
import "./action-badge";
import "./integration-badge";

const HIDDEN_DOMAINS = new Set([
  "hassio",
  "met",
  "radio_browser",
  "rpi_power",
  "sun",
]);

@customElement("onboarding-integrations")
class OnboardingIntegrations extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public onboardingLocalize!: LocalizeFunc;

  @state() private _entries: ConfigEntry[] = [];

  @state() private _discovered?: DataEntryFlowProgress[];

  public hassSubscribe(): Array<UnsubscribeFunc | Promise<UnsubscribeFunc>> {
    return [
      subscribeConfigFlowInProgress(this.hass, (flows) => {
        this._discovered = flows;
        const integrations: Set<string> = new Set();
        for (const flow of flows) {
          // To render title placeholders
          if (flow.context.title_placeholders) {
            integrations.add(flow.handler);
          }
        }
        this.hass.loadBackendTranslation("config", Array.from(integrations));
      }),
      subscribeConfigEntries(
        this.hass,
        (messages) => {
          let fullUpdate = false;
          const newEntries: ConfigEntry[] = [];
          messages.forEach((message) => {
            if (message.type === null || message.type === "added") {
              if (HIDDEN_DOMAINS.has(message.entry.domain)) {
                return;
              }
              newEntries.push(message.entry);
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
          const existingEntries = fullUpdate ? [] : this._entries;
          this._entries = [...existingEntries!, ...newEntries];
        },
        { type: ["device", "hub", "service"] }
      ),
    ];
  }

  protected render() {
    if (!this._discovered) {
      return nothing;
    }
    // Render discovered and existing entries together sorted by localized title.
    const entries: Array<[string, TemplateResult]> = this._entries.map(
      (entry) => {
        const title =
          entry.title ||
          domainToName(this.hass.localize, entry.domain) ||
          entry.domain;
        return [
          title,
          html`
            <integration-badge
              .domain=${entry.domain}
              .title=${title}
              .badgeIcon=${mdiCheck}
              .darkOptimizedIcon=${this.hass.themes?.darkMode}
            ></integration-badge>
          `,
        ];
      }
    );
    const discovered: Array<[string, TemplateResult]> = this._discovered.map(
      (flow) => {
        const title = localizeConfigFlowTitle(this.hass.localize, flow);
        return [
          title,
          html`
            <button .flowId=${flow.flow_id} @click=${this._continueFlow}>
              <integration-badge
                clickable
                .domain=${flow.handler}
                .title=${title}
                .darkOptimizedIcon=${this.hass.themes?.darkMode}
              ></integration-badge>
            </button>
          `,
        ];
      }
    );
    const content = [...entries, ...discovered]
      .sort((a, b) => stringCompare(a[0], b[0], this.hass.locale.language))
      .map((item) => item[1]);

    return html`
      <p>
        ${this.onboardingLocalize("ui.panel.page-onboarding.integration.intro")}
      </p>
      <div class="badges">
        ${content}
        <button @click=${this._createFlow}>
          <action-badge
            clickable
            title=${this.onboardingLocalize(
              "ui.panel.page-onboarding.integration.more_integrations"
            )}
            .icon=${mdiDotsHorizontal}
          ></action-badge>
        </button>
      </div>
      <div class="footer">
        <mwc-button @click=${this._finish}>
          ${this.onboardingLocalize(
            "ui.panel.page-onboarding.integration.finish"
          )}
        </mwc-button>
      </div>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.hass.loadBackendTranslation("title", undefined, true);
    this._scanUSBDevices();
    loadConfigFlowDialog();
  }

  private _createFlow() {
    showAddIntegrationDialog(this);
  }

  private _continueFlow(ev) {
    showConfigFlowDialog(this, {
      continueFlowId: ev.currentTarget.flowId,
      dialogClosedCallback: () => {
        getConfigFlowInProgressCollection(this.hass!.connection).refresh();
      },
    });
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
    return css`
      p {
        font-size: 14px;
        line-height: 20px;
      }
      .badges {
        margin-top: 24px;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: flex-start;
        align-items: flex-start;
      }
      .badges > * {
        width: 96px;
        margin-bottom: 24px;
      }
      button {
        cursor: pointer;
        padding: 0;
        border: 0;
        background: 0;
        font: inherit;
      }
      .footer {
        text-align: right;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-integrations": OnboardingIntegrations;
  }
}
