import "@material/mwc-button/mwc-button";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { compare } from "../common/string/compare";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { LocalizeFunc } from "../common/translations/localize";
import { ConfigEntry, getConfigEntries } from "../data/config_entries";
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
import { HomeAssistant } from "../types";
import "./action-badge";
import "./integration-badge";

const HIDDEN_DOMAINS = new Set(["met", "rpi_power"]);

@customElement("onboarding-integrations")
class OnboardingIntegrations extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public onboardingLocalize!: LocalizeFunc;

  @state() private _entries?: ConfigEntry[];

  @state() private _discovered?: DataEntryFlowProgress[];

  private _unsubEvents?: () => void;

  public connectedCallback() {
    super.connectedCallback();
    this.hass.loadBackendTranslation("title", undefined, true);
    this._unsubEvents = subscribeConfigFlowInProgress(this.hass, (flows) => {
      this._discovered = flows;
      for (const flow of flows) {
        // To render title placeholders
        if (flow.context.title_placeholders) {
          this.hass.loadBackendTranslation("config", flow.handler);
        }
      }
    });
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubEvents) {
      this._unsubEvents();
      this._unsubEvents = undefined;
    }
  }

  protected render(): TemplateResult {
    if (!this._entries || !this._discovered) {
      return html``;
    }
    // Render discovered and existing entries together sorted by localized title.
    const entries: Array<[string, TemplateResult]> = this._entries.map(
      (entry) => {
        const title = domainToName(this.hass.localize, entry.domain);
        return [
          title,
          html`
            <integration-badge
              .domain=${entry.domain}
              .title=${title}
              badgeIcon="hass:check"
              .darkOptimizedIcon=${this.hass.selectedTheme?.dark}
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
                .darkOptimizedIcon=${this.hass.selectedTheme?.dark}
              ></integration-badge>
            </button>
          `,
        ];
      }
    );
    const content = [...entries, ...discovered]
      .sort((a, b) => compare(a[0], b[0]))
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
            icon="hass:dots-horizontal"
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
    this._scanUSBDevices();
    loadConfigFlowDialog();
    this._loadConfigEntries();
    /* polyfill for paper-dropdown */
    import("web-animations-js/web-animations-next-lite.min");
  }

  private _createFlow() {
    showConfigFlowDialog(this, {
      dialogClosedCallback: () => {
        this._loadConfigEntries();
        getConfigFlowInProgressCollection(this.hass!.connection).refresh();
      },
    });
  }

  private _continueFlow(ev) {
    showConfigFlowDialog(this, {
      continueFlowId: ev.currentTarget.flowId,
      dialogClosedCallback: () => {
        this._loadConfigEntries();
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

  private async _loadConfigEntries() {
    const entries = await getConfigEntries(this.hass!);
    // We filter out the config entry for the local weather and rpi_power.
    // It is one that we create automatically and it will confuse the user
    // if it starts showing up during onboarding.
    this._entries = entries.filter(
      (entry) => !HIDDEN_DOMAINS.has(entry.domain)
    );
  }

  private async _finish() {
    fireEvent(this, "onboarding-step", {
      type: "integration",
    });
  }

  static get styles(): CSSResultGroup {
    return css`
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
