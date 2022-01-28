import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import "../../../components/ha-card";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  domainToName,
  fetchIntegrationManifests,
  fetchIntegrationSetups,
  integrationIssuesUrl,
  IntegrationManifest,
  IntegrationSetup,
  IntegrationLogInfo,
  subscribeLogInfo,
  setIntegrationLogLevel,
} from "../../../data/integration";
import { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { documentationUrl } from "../../../util/documentation-url";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";

@customElement("integrations-card")
class IntegrationsCard extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _manifests?: {
    [domain: string]: IntegrationManifest;
  };

  @state() private _setups?: {
    [domain: string]: IntegrationSetup;
  };

  @state() private _log_infos?: {
    [integration: string]: IntegrationLogInfo;
  };

  private _sortedIntegrations = memoizeOne((components: string[]) =>
    Array.from(
      new Set(
        components.map((comp) =>
          comp.includes(".") ? comp.split(".")[1] : comp
        )
      )
    ).sort()
  );

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeLogInfo(this.hass.connection!, (log_infos) => {
        const logInfoLookup: { [integration: string]: IntegrationLogInfo } = {};
        for (const log_info of log_infos) {
          logInfoLookup[log_info.domain] = log_info;
        }
        this._log_infos = logInfoLookup;
      }),
    ];
  }

  firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this._fetchManifests();
    this._fetchSetups();
  }

  protected render(): TemplateResult {
    return html`
      <ha-card
        .header=${this.hass.localize("ui.panel.config.info.integrations")}
      >
        <table class="card-content">
          <thead>
            <tr>
              <th></th>
              <th></th>
              ${!this.narrow
                ? html`<th></th>
                    <th></th>`
                : ""}
              <th class="debug">
                ${this.hass.localize("ui.panel.config.info.debug_logging")}
              </th>
              <th>${this.hass.localize("ui.panel.config.info.setup_time")}</th>
            </tr>
          </thead>
          <tbody>
            ${this._sortedIntegrations(this.hass!.config.components).map(
              (domain) => {
                const manifest = this._manifests && this._manifests[domain];
                const docLink = manifest
                  ? html`<a
                      href=${manifest.is_built_in
                        ? documentationUrl(
                            this.hass,
                            `/integrations/${manifest.domain}`
                          )
                        : manifest.documentation}
                      target="_blank"
                      rel="noreferrer"
                      >${this.hass.localize(
                        "ui.panel.config.info.documentation"
                      )}</a
                    >`
                  : "";
                const issueLink =
                  manifest && (manifest.is_built_in || manifest.issue_tracker)
                    ? html`
                        <a
                          href=${integrationIssuesUrl(domain, manifest)}
                          target="_blank"
                          rel="noreferrer"
                          >${this.hass.localize(
                            "ui.panel.config.info.issues"
                          )}</a
                        >
                      `
                    : "";
                const setupSeconds =
                  this._setups?.[domain]?.seconds?.toFixed(2);
                const logLevel = this._log_infos?.[domain]?.level;
                return html`
                  <tr>
                    <td>
                      <img
                        loading="lazy"
                        src=${brandsUrl({
                          domain: domain,
                          type: "icon",
                          useFallback: true,
                          darkOptimized: this.hass.themes?.darkMode,
                        })}
                        referrerpolicy="no-referrer"
                      />
                    </td>
                    <td class="name">
                      ${domainToName(
                        this.hass.localize,
                        domain,
                        manifest
                      )}<br />
                      <span class="domain">${domain}</span>
                      ${this.narrow
                        ? html`<div class="mobile-row">
                            <div>${docLink} ${issueLink}</div>
                          </div>`
                        : ""}
                    </td>
                    ${this.narrow
                      ? ""
                      : html`
                          <td>${docLink}</td>
                          <td>${issueLink}</td>
                        `}
                    <td class="log">
                      ${logLevel === 10
                        ? html`<mwc-button
                            .integration=${domain}
                            @click=${this._disableDebug}
                            >${this.hass.localize(
                              "ui.panel.config.info.disable"
                            )}</mwc-button
                          >`
                        : html`<mwc-button
                            .integration=${domain}
                            @click=${this._enableDebug}
                            >${this.hass.localize(
                              "ui.panel.config.info.enable"
                            )}</mwc-button
                          >`}
                    </td>
                    <td class="setup">
                      ${setupSeconds ? html`${setupSeconds} s` : ""}
                    </td>
                  </tr>
                `;
              }
            )}
          </tbody>
        </table>
      </ha-card>
    `;
  }

  private async _fetchManifests() {
    const manifests = {};
    for (const manifest of await fetchIntegrationManifests(this.hass)) {
      manifests[manifest.domain] = manifest;
    }
    this._manifests = manifests;
  }

  private async _fetchSetups() {
    const setups = {};
    for (const setup of await fetchIntegrationSetups(this.hass)) {
      setups[setup.domain] = setup;
    }
    this._setups = setups;
  }

  private async _disableDebug(e: MouseEvent) {
    const integration = (e.currentTarget as any).integration;
    await setIntegrationLogLevel(this.hass, integration, "NOTSET");
  }

  private async _enableDebug(e: MouseEvent) {
    const integration = (e.currentTarget as any).integration;
    await setIntegrationLogLevel(this.hass, integration, "DEBUG");
  }

  static get styles(): CSSResultGroup {
    return css`
      table {
        width: 100%;
      }
      td,
      th {
        padding: 0 8px;
      }
      td:first-child {
        padding-left: 0;
      }
      td.name {
        padding: 8px;
      }
      td.setup {
        text-align: right;
        white-space: nowrap;
      }
      th {
        text-align: right;
      }
      .debug {
        text-align: center;
      }
      .domain {
        color: var(--secondary-text-color);
      }
      .mobile-row {
        display: flex;
        justify-content: space-between;
      }
      .mobile-row a:not(:last-of-type) {
        margin-right: 4px;
      }
      img {
        display: block;
        max-height: 40px;
        max-width: 40px;
      }
      a {
        color: var(--primary-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "integrations-card": IntegrationsCard;
  }
}
