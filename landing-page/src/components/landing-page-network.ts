import "@material/mwc-linear-progress/mwc-linear-progress";
import {
  type CSSResultGroup,
  LitElement,
  type PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import type {
  LocalizeFunc,
  LocalizeKeys,
} from "../../../src/common/translations/localize";
import "../../../src/components/ha-button";
import "../../../src/components/ha-alert";
import { getSupervisorNetworkInfo } from "../data/supervisor";
import { fireEvent } from "../../../src/common/dom/fire_event";

const SCHEDULE_FETCH_NETWORK_INFO_SECONDS = 5;

const ALTERNATIVE_DNS_SERVERS: {
  ipv4: string[];
  ipv6: string[];
  translationKey: LocalizeKeys;
}[] = [
  {
    ipv4: ["1.1.1.1", "1.0.0.1"],
    ipv6: ["2606:4700:4700::1111", "2606:4700:4700::1001"],
    translationKey:
      "ui.panel.page-onboarding.prepare.network_issue.use_cloudflare",
  },
  {
    ipv4: ["8.8.8.8", "8.8.4.4"],
    ipv6: ["2001:4860:4860::8888", "2001:4860:4860::8844"],
    translationKey: "ui.panel.page-onboarding.prepare.network_issue.use_google",
  },
];

@customElement("landing-page-network")
class LandingPageNetwork extends LitElement {
  @property({ attribute: false }) public localize!: LocalizeFunc;

  @state() private _networkIssue = false;

  @state() private _getNetworkInfoError = false;

  @state() private _dnsPrimaryInterface?: string;

  protected render() {
    if (!this._networkIssue && !this._getNetworkInfoError) {
      return nothing;
    }

    if (this._getNetworkInfoError) {
      return html`
        <ha-alert alert-type="error">
          <p>
            ${this.localize(
              "ui.panel.page-onboarding.prepare.network_issue.error_get_network_info"
            )}
          </p>
        </ha-alert>
      `;
    }

    return html`
      <ha-alert
        alert-type="warning"
        .title=${this.localize(
          "ui.panel.page-onboarding.prepare.network_issue.title"
        )}
      >
        <p>
          ${this.localize(
            "ui.panel.page-onboarding.prepare.network_issue.description",
            { dns: this._dnsPrimaryInterface || "?" }
          )}
        </p>
        <p>
          ${this.localize(
            "ui.panel.page-onboarding.prepare.network_issue.resolve_different"
          )}
        </p>
        ${!this._dnsPrimaryInterface
          ? html`
              <p>
                <b
                  >${this.localize(
                    "ui.panel.page-onboarding.prepare.network_issue.no_primary_interface"
                  )}
                </b>
              </p>
            `
          : nothing}
        <div class="actions">
          ${ALTERNATIVE_DNS_SERVERS.map(
            ({ translationKey }, key) =>
              html`<ha-button
                .index=${key}
                .disabled=${!this._dnsPrimaryInterface}
                @click=${this._setDns}
                >${this.localize(translationKey)}</ha-button
              >`
          )}
        </div>
      </ha-alert>
    `;
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    this._fetchSupervisorInfo();
  }

  private _scheduleFetchSupervisorInfo() {
    setTimeout(
      () => this._fetchSupervisorInfo(),
      SCHEDULE_FETCH_NETWORK_INFO_SECONDS * 1000
    );
  }

  private async _fetchSupervisorInfo() {
    try {
      const response = await getSupervisorNetworkInfo();
      if (!response.ok) {
        throw new Error("Failed to fetch network info");
      }

      const { data } = await response.json();

      this._getNetworkInfoError = false;

      if (!data.host_internet) {
        this._networkIssue = true;
        const primaryInterface = data.interfaces.find(
          (intf) => intf.primary && intf.enabled
        );
        if (primaryInterface) {
          this._dnsPrimaryInterface = [
            ...(primaryInterface.ipv4?.nameservers || []),
            ...(primaryInterface.ipv6?.nameservers || []),
          ].join(", ");
        }
      } else {
        this._networkIssue = false;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      this._getNetworkInfoError = true;
    }

    fireEvent(this, "value-changed", {
      value: this._networkIssue || this._getNetworkInfoError,
    });
    this._scheduleFetchSupervisorInfo();
  }

  private async _setDns(ev) {
    const index = ev.target?.index;
    try {
      const response = await fetch("/supervisor/network/dns", {
        method: "POST",
        body: JSON.stringify({
          ipv4: {
            method: "auto",
            nameservers: ALTERNATIVE_DNS_SERVERS[index].ipv4,
          },
          ipv6: {
            method: "auto",
            nameservers: ALTERNATIVE_DNS_SERVERS[index].ipv6,
          },
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to set DNS");
      }
      this._networkIssue = false;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      this._getNetworkInfoError = true;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        .actions {
          display: flex;
          justify-content: flex-end;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "landing-page-network": LandingPageNetwork;
  }
}
