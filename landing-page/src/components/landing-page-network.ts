import "@material/mwc-linear-progress/mwc-linear-progress";
import memoizeOne from "memoize-one";
import { type CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import type {
  LandingPageKeys,
  LocalizeFunc,
} from "../../../src/common/translations/localize";
import "../../../src/components/ha-button";
import "../../../src/components/ha-alert";
import {
  ALTERNATIVE_DNS_SERVERS,
  setSupervisorNetworkDns,
  type NetworkInfo,
} from "../data/supervisor";
import { showAlertDialog } from "../../../src/dialogs/generic/show-dialog-box";
import type { NetworkInterface } from "../../../src/data/hassio/network";
import { fireEvent } from "../../../src/common/dom/fire_event";

@customElement("landing-page-network")
class LandingPageNetwork extends LitElement {
  @property({ attribute: false })
  public localize!: LocalizeFunc<LandingPageKeys>;

  @property({ attribute: false }) public networkInfo?: NetworkInfo;

  @property({ type: Boolean }) public error = false;

  protected render() {
    if (this.error) {
      return html`
        <ha-alert alert-type="error">
          <p>${this.localize("network_issue.error_get_network_info")}</p>
        </ha-alert>
      `;
    }

    let dnsPrimaryInterfaceNameservers: string | undefined;

    const primaryInterface = this._getPrimaryInterface(
      this.networkInfo?.interfaces
    );
    if (primaryInterface) {
      dnsPrimaryInterfaceNameservers =
        this._getPrimaryNameservers(primaryInterface);
    }

    return html`
      <ha-alert
        alert-type="warning"
        .title=${this.localize("network_issue.title")}
      >
        <p>
          ${this.localize("network_issue.description", {
            dns: dnsPrimaryInterfaceNameservers || "?",
          })}
        </p>
        <p>${this.localize("network_issue.resolve_different")}</p>
        ${!dnsPrimaryInterfaceNameservers
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
                .disabled=${!dnsPrimaryInterfaceNameservers}
                @click=${this._setDns}
                >${this.localize(translationKey)}</ha-button
              >`
          )}
        </div>
      </ha-alert>
    `;
  }

  private _getPrimaryInterface = memoizeOne((interfaces?: NetworkInterface[]) =>
    interfaces?.find((intf) => intf.primary && intf.enabled)
  );

  private _getPrimaryNameservers = memoizeOne(
    (primaryInterface: NetworkInterface) =>
      [
        ...(primaryInterface.ipv4?.nameservers || []),
        ...(primaryInterface.ipv6?.nameservers || []),
      ].join(", ")
  );

  private async _setDns(ev) {
    const primaryInterface = this._getPrimaryInterface(
      this.networkInfo?.interfaces
    );

    const index = ev.target?.index;
    try {
      const dnsPrimaryInterface = primaryInterface?.interface;
      if (!dnsPrimaryInterface) {
        throw new Error("No primary interface found");
      }

      const response = await setSupervisorNetworkDns(
        index,
        dnsPrimaryInterface
      );
      if (!response.ok) {
        throw new Error("Failed to set DNS");
      }

      // notify landing page to trigger a network info reload
      fireEvent(this, "dns-set");
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(err);
      showAlertDialog(this, {
        title: this.localize("network_issue.failed"),
        warning: true,
        text: `${this.localize(
          "network_issue.set_dns_failed"
        )}${err?.message ? ` ${this.localize("network_issue.error")}: ${err.message}` : ""}`,
        confirmText: this.localize("network_issue.close"),
      });
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
  interface HASSDomEvents {
    "dns-set": undefined;
  }
}
