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
  LandingPageKeys,
  LocalizeFunc,
} from "../../../src/common/translations/localize";
import "../../../src/components/ha-button";
import "../../../src/components/ha-alert";
import {
  ALTERNATIVE_DNS_SERVERS,
  getSupervisorNetworkInfo,
  setSupervisorNetworkDns,
} from "../data/supervisor";
import { fireEvent } from "../../../src/common/dom/fire_event";

const SCHEDULE_FETCH_NETWORK_INFO_SECONDS = 5;

@customElement("landing-page-network")
class LandingPageNetwork extends LitElement {
  @property({ attribute: false })
  public localize!: LocalizeFunc<LandingPageKeys>;

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
          <p>${this.localize("network_issue.error_get_network_info")}</p>
        </ha-alert>
      `;
    }

    return html`
      <ha-alert
        alert-type="warning"
        .title=${this.localize("network_issue.title")}
      >
        <p>
          ${this.localize("network_issue.description", {
            dns: this._dnsPrimaryInterface || "?",
          })}
        </p>
        <p>${this.localize("network_issue.resolve_different")}</p>
        ${!this._dnsPrimaryInterface
          ? html`
              <p>
                <b>${this.localize("network_issue.no_primary_interface")} </b>
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
      const response = await setSupervisorNetworkDns(index);
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
