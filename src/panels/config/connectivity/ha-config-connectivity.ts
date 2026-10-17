import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  mdiAlertCircleOutline,
  mdiAlertOutline,
  mdiCheck,
  mdiMenuDown,
} from "@mdi/js";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/ha-alert";
import "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-svg-icon";
import "../../../components/ha-icon-next";
import "../../../components/item/ha-list-item-button";
import "../../../components/list/ha-list-nav";
import type { ConfigEntry } from "../../../data/config_entries";
import { getConfigEntries } from "../../../data/config_entries";
import { brandsUrl } from "../../../util/brands-url";
import "../../../components/ha-card";
import "../../../layouts/hass-subpage";
import { ChildPanelReady } from "../../../layouts/panel-ready";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { configSections } from "../config-sections";
import "../dashboard/ha-config-navigation";
import "../ha-config-section";
import { navigate } from "../../../common/navigate";
import { domainToName } from "../../../data/integration";

const OVERVIEW_DOMAINS = [
  ...new Set([
    ...configSections.connectivity
      .flatMap((page) => page.component ?? [])
      .filter((component) => component !== "tag"),
    "infrared",
    "serial",
  ]),
];

const findPage = (domain: string) =>
  configSections.connectivity.find((page) =>
    [page.component].flat().includes(domain)
  );

const pagePath = (domain: string) =>
  findPage(domain)?.path ?? `/config/integrations/integration/${domain}`;

interface Overview {
  total: number;
  offline: { domain: string; count: number }[];
  problems: { domain: string; text: string; severity: "error" | "warning" }[];
}

@customElement("ha-config-connectivity")
class HaConfigConnectivity extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _entries: ConfigEntry[] = [];

  public constructor() {
    super();
    new ChildPanelReady(this);
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this._load();
  }

  private async _load() {
    this.hass.loadBackendTranslation("title", OVERVIEW_DOMAINS);
    const domains = OVERVIEW_DOMAINS.filter((d) =>
      isComponentLoaded(this.hass.config, d)
    );
    const results = await Promise.all(
      domains.map((domain) => getConfigEntries(this.hass, { domain }))
    );
    this._entries = results
      .flat()
      .filter((e) => e.disabled_by === null && e.source !== "ignore");
  }

  private _openOffline(ev: CustomEvent<{ item: { value: string } }>) {
    navigate(ev.detail.item.value);
  }

  private _overview(): Overview | null {
    if (!this._entries.length) {
      return null;
    }
    const allUnavailable = new Map<string, boolean>();
    for (const entity of Object.values(this.hass.entities)) {
      if (entity.device_id) {
        allUnavailable.set(
          entity.device_id,
          (allUnavailable.get(entity.device_id) ?? true) &&
            this.hass.states[entity.entity_id]?.state === "unavailable"
        );
      }
    }

    const result: Overview = { total: 0, offline: [], problems: [] };
    const perDomain = new Map<string, { devices: number; offline: number }>();
    for (const entry of this._entries) {
      const devices = Object.values(this.hass.devices).filter((d) =>
        d.config_entries.includes(entry.entry_id)
      );
      const stats = perDomain.get(entry.domain) ?? { devices: 0, offline: 0 };
      stats.devices += devices.length;
      stats.offline += devices.filter((d) => allUnavailable.get(d.id)).length;
      perDomain.set(entry.domain, stats);
      result.total += devices.length;
      if (entry.state !== "loaded") {
        result.problems.push({
          domain: entry.domain,
          severity: "error",
          text: this.hass.localize(
            `ui.panel.config.integrations.config_entry.state.${entry.state}`
          ),
        });
      }
    }
    for (const [domain, { devices, offline }] of perDomain) {
      if (!offline) {
        continue;
      }
      result.offline.push({ domain, count: offline });
      if (result.problems.some((x) => x.domain === domain)) {
        continue;
      }
      if (offline === devices) {
        result.problems.push({
          domain,
          severity: "error",
          text: this.hass.localize(
            "ui.panel.config.dashboard.connectivity.all_offline"
          ),
        });
      } else if (offline * 2 >= devices) {
        result.problems.push({
          domain,
          severity: "warning",
          text: this.hass.localize(
            "ui.panel.config.dashboard.connectivity.many_offline"
          ),
        });
      }
    }
    return result;
  }

  private _renderOverview() {
    const overview = this._overview();
    if (!overview) {
      return nothing;
    }
    const t = (key: string, values?: Record<string, number>) =>
      this.hass.localize(
        `ui.panel.config.dashboard.connectivity.${key}` as any,
        values
      );
    const name = (domain: string) => {
      const key = findPage(domain)?.translationKey;
      return (
        (key && this.hass.localize(key as any)) ||
        domainToName(this.hass.localize, domain)
      );
    };
    const { total, offline, problems } = overview;
    const offlineTotal = offline.reduce((sum, x) => sum + x.count, 0);
    const level = problems.some((x) => x.severity === "error")
      ? "error"
      : problems.length
        ? "warning"
        : "success";
    const ok = level === "success";

    return html`
      <ha-card outlined class="overview ${level}">
        <div class="card-content">
          <div class="heading">
            <div class="icon ${level}">
              <ha-svg-icon
                .path=${
                  level === "error"
                    ? mdiAlertCircleOutline
                    : problems.length
                      ? mdiAlertOutline
                      : mdiCheck
                }
              ></ha-svg-icon>
            </div>
            <div class="details">
              ${t(ok ? "all_ok" : "issues")}<br />
              <small>
                ${t("device_count", { count: total })}
                ${
                  offlineTotal
                    ? html`<ha-dropdown @wa-select=${this._openOffline}>
                        <button slot="trigger" class="offline">
                          ${t("offline_count", { count: offlineTotal })}
                          <ha-svg-icon .path=${mdiMenuDown}></ha-svg-icon>
                        </button>
                        <h3 class="menu-header">${t("offline_devices")}</h3>
                        ${offline.map(
                          ({ domain, count }) => html`
                            <ha-dropdown-item .value=${pagePath(domain)}>
                              <img
                                slot="icon"
                                class="logo"
                                alt=""
                                crossorigin="anonymous"
                                referrerpolicy="no-referrer"
                                src=${brandsUrl(
                                  {
                                    domain,
                                    type: "icon",
                                    darkOptimized: this.hass.themes?.darkMode,
                                  },
                                  this.hass.auth.data.hassUrl
                                )}
                              />
                              ${name(domain)}
                              <span slot="details" class="count">${count}</span>
                            </ha-dropdown-item>
                          `
                        )}
                      </ha-dropdown>`
                    : nothing
                }
              </small>
            </div>
          </div>
        </div>
        ${problems.map(
          ({ domain, text, severity }) => html`
            <a class="problem ${severity}" href=${pagePath(domain)}>
              <ha-alert alert-type=${severity} .title=${name(domain)}>
                ${text}
              </ha-alert>
            </a>
          `
        )}
      </ha-card>
    `;
  }

  protected render(): TemplateResult {
    const title = this.hass.localize(
      "ui.panel.config.dashboard.connectivity.main"
    );

    return html`
      <hass-subpage
        .hass=${this.hass}
        back-path="/config"
        .header=${title}
        .narrow=${this.narrow}
      >
        <ha-config-section .isWide=${this.isWide} full-width>
          ${this._renderOverview()}
          <ha-card outlined>
            <ha-config-navigation
              .hass=${this.hass}
              .narrow=${this.narrow}
              .pages=${configSections.connectivity}
              .label=${title}
            ></ha-config-navigation>
          </ha-card>
        </ha-config-section>
      </hass-subpage>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-config-section {
          margin: auto;
          margin-top: -32px;
          max-width: 600px;
        }

        ha-card {
          overflow: hidden;
          margin-bottom: max(24px, var(--safe-area-inset-bottom));
        }

        .overview .heading {
          display: flex;
          align-items: center;
          column-gap: var(--ha-space-4);
        }

        .overview .icon {
          position: relative;
          border-radius: var(--ha-border-radius-2xl);
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          --icon-color: var(--success-color);
        }

        .overview .icon.error {
          --icon-color: var(--error-color);
        }

        .overview .icon.warning {
          --icon-color: var(--warning-color);
        }

        .overview .icon::before {
          content: "";
          position: absolute;
          inset: 0;
          background-color: var(--icon-color);
          opacity: 0.2;
        }

        .overview .icon ha-svg-icon {
          color: var(--icon-color);
        }

        .overview .details {
          font-size: var(--ha-font-size-xl);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
          color: var(--primary-text-color);
        }

        .overview small {
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
          letter-spacing: 0.25px;
          color: var(--secondary-text-color);
        }

        .overview .problem {
          display: block;
          color: inherit;
          text-decoration: none;
          border-top: 1px solid var(--divider-color);
        }

        .overview .problem.warning {
          color: var(--warning-color);
        }

        .overview .problem.error {
          color: var(--error-color);
        }

        .overview .offline ha-svg-icon {
          width: 18px;
          height: 18px;
        }

        .overview .menu-header {
          margin: 0;
          padding: var(--ha-space-2) var(--ha-space-3);
          font-size: var(--ha-font-size-s);
          font-weight: var(--ha-font-weight-medium);
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: var(--secondary-text-color);
        }

        .overview .logo {
          width: 24px;
          height: 24px;
          object-fit: contain;
        }

        .overview .offline {
          display: inline-flex;
          align-items: center;
          background: none;
          border: none;
          padding: 0;
          font: inherit;
          letter-spacing: inherit;
          color: var(--offline-color, inherit);
          cursor: pointer;
        }

        .overview .count {
          min-width: 24px;
          padding: 2px var(--ha-space-2);
          border-radius: 12px;
          text-align: center;
          font-weight: var(--ha-font-weight-medium);
          color: var(--offline-color, var(--primary-text-color));
          background: color-mix(
            in srgb,
            var(--offline-color, var(--secondary-text-color)) 15%,
            transparent
          );
        }

        .overview.error {
          --offline-color: var(--error-color);
        }

        .overview.warning {
          --offline-color: var(--warning-color);
        }

        @media all and (max-width: 600px) {
          ha-card {
            border-width: 1px 0;
            border-radius: var(--ha-border-radius-square);
            box-shadow: unset;
          }
          ha-config-section {
            margin-top: -42px;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-connectivity": HaConfigConnectivity;
  }
}
