import "@home-assistant/webawesome/dist/components/divider/divider";
import type { RequestSelectedDetail } from "@material/mwc-list/mwc-list-item-base";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { fireEvent } from "../../../common/dom/fire_event";
import {
  PROTOCOL_INTEGRATIONS,
  protocolIntegrationPicked,
} from "../../../common/integrations/protocolIntegrationPicked";
import { navigate } from "../../../common/navigate";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import "../../../components/item/ha-list-item-button";
import "../../../components/list/ha-list-base";
import { localizeConfigFlowTitle } from "../../../data/config_flow";
import type { DataEntryFlowProgress } from "../../../data/data_entry_flow";
import {
  domainToName,
  fetchIntegrationManifest,
} from "../../../data/integration";
import type { Brand, Integration } from "../../../data/integrations";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import "./ha-integration-list-item";
import { showYamlIntegrationDialog } from "./show-add-integration-dialog";

const standardToDomain = { zigbee: "zha", zwave: "zwave_js" } as const;

@customElement("ha-domain-integrations")
class HaDomainIntegrations extends LitElement {
  public hass!: HomeAssistant;

  @property() public domain!: string;

  @property({ attribute: false }) public integration?: Brand | Integration;

  @property({ attribute: false })
  public flowsInProgress?: DataEntryFlowProgress[];

  @property({ attribute: false })
  public navigateToResult = false;

  @property({ attribute: false })
  public showManageLink = false;

  protected render() {
    return html`<ha-list-base>
      ${this.flowsInProgress?.length
        ? html`<h3>
              ${this.hass.localize("ui.panel.config.integrations.discovered")}
            </h3>
            ${this.flowsInProgress.map(
              (flow) =>
                html`<ha-list-item-button
                  .flow=${flow}
                  @click=${this._flowInProgressPicked}
                >
                  <img
                    alt=""
                    slot="start"
                    loading="lazy"
                    src=${brandsUrl(
                      {
                        domain: flow.handler,
                        type: "icon",
                        darkOptimized: this.hass.themes?.darkMode,
                      },
                      this.hass.auth.data.hassUrl
                    )}
                    crossorigin="anonymous"
                    referrerpolicy="no-referrer"
                  />
                  <span slot="headline"
                    >${localizeConfigFlowTitle(this.hass.localize, flow)}</span
                  >
                  <span slot="supporting-text"
                    >${domainToName(this.hass.localize, flow.handler)}</span
                  >
                  <ha-icon-next slot="end"></ha-icon-next>
                </ha-list-item-button>`
            )}
            <wa-divider></wa-divider>
            ${this.integration &&
            "integrations" in this.integration &&
            this.integration.integrations
              ? html`<h3>
                  ${this.hass.localize(
                    "ui.panel.config.integrations.available_integrations"
                  )}
                </h3>`
              : nothing}`
        : nothing}
      ${this.integration?.iot_standards
        ? this.integration.iot_standards
            .filter((standard) =>
              (PROTOCOL_INTEGRATIONS as readonly string[]).includes(
                standardToDomain[standard] || standard
              )
            )
            .map((standard) => {
              const domain: (typeof PROTOCOL_INTEGRATIONS)[number] =
                standardToDomain[standard] || standard;
              return html`<ha-list-item-button
                .domain=${domain}
                @click=${this._standardPicked}
              >
                <img
                  slot="start"
                  loading="lazy"
                  alt=""
                  src=${brandsUrl(
                    {
                      domain,
                      type: "icon",
                      darkOptimized: this.hass.themes?.darkMode,
                    },
                    this.hass.auth.data.hassUrl
                  )}
                  crossorigin="anonymous"
                  referrerpolicy="no-referrer"
                />
                <span slot="headline"
                  >${this.hass.localize(
                    `ui.panel.config.integrations.add_${domain}_device`
                  )}</span
                >
                <ha-icon-next slot="end"></ha-icon-next>
              </ha-list-item-button>`;
            })
        : ""}
      ${this.integration &&
      "integrations" in this.integration &&
      this.integration.integrations
        ? Object.entries(this.integration.integrations)
            .filter(([, val]) => val.integration_type !== "hardware")
            .sort((a, b) => {
              if (a[1].config_flow && !b[1].config_flow) {
                return -1;
              }
              if (b[1].config_flow && !a[1].config_flow) {
                return 0;
              }
              return caseInsensitiveStringCompare(
                a[1].name || domainToName(this.hass.localize, a[0]),
                b[1].name || domainToName(this.hass.localize, b[0]),
                this.hass.locale.language
              );
            })
            .map(
              ([dom, val]) =>
                html`<ha-integration-list-item
                  .integration=${{
                    ...val,
                    domain: dom,
                    name: val.name || domainToName(this.hass.localize, dom),
                    is_built_in: val.is_built_in !== false,
                    cloud: val.iot_class?.startsWith("cloud_"),
                  }}
                  @click=${this._integrationPicked}
                >
                </ha-integration-list-item>`
            )
        : ""}
      ${(PROTOCOL_INTEGRATIONS as readonly string[]).includes(this.domain)
        ? html`<ha-list-item-button
            graphic="medium"
            .domain=${this.domain}
            @request-selected=${this._standardPicked}
            hasMeta
          >
            <img
              slot="graphic"
              loading="lazy"
              alt=""
              src=${brandsUrl(
                {
                  domain: this.domain,
                  type: "icon",
                  darkOptimized: this.hass.themes?.darkMode,
                },
                this.hass.auth.data.hassUrl
              )}
              crossorigin="anonymous"
              referrerpolicy="no-referrer"
            />
            <span
              >${this.hass.localize(
                `ui.panel.config.integrations.add_${
                  this.domain as (typeof PROTOCOL_INTEGRATIONS)[number]
                }_device`
              )}</span
            >
            <ha-icon-next slot="meta"></ha-icon-next>
          </ha-list-item-button>`
        : ""}
      ${this.integration &&
      "config_flow" in this.integration &&
      this.integration.config_flow
        ? html`${this.flowsInProgress?.length
            ? html`<ha-list-item-button
                .domain=${this.domain}
                @request-selected=${this._integrationPicked}
                .integration=${{
                  ...this.integration,
                  domain: this.domain,
                  name:
                    this.integration.name ||
                    domainToName(this.hass.localize, this.domain),
                  is_built_in: this.integration.is_built_in !== false,
                  cloud: this.integration.iot_class?.startsWith("cloud_"),
                }}
                hasMeta
              >
                ${this.hass.localize("ui.panel.config.integrations.new_flow", {
                  integration:
                    this.integration.name ||
                    domainToName(this.hass.localize, this.domain),
                })}
                <ha-icon-next slot="meta"></ha-icon-next>
              </ha-list-item-button>`
            : html`<ha-integration-list-item
                .domain=${this.domain}
                .integration=${{
                  ...this.integration,
                  domain: this.domain,
                  name:
                    this.integration.name ||
                    domainToName(this.hass.localize, this.domain),
                  is_built_in: this.integration.is_built_in !== false,
                  cloud: this.integration.iot_class?.startsWith("cloud_"),
                }}
                @click=${this._integrationPicked}
              >
              </ha-integration-list-item>`}`
        : ""}
      ${this.showManageLink &&
      // Only show manage link if not already on the integrations dashboard
      !location.pathname.startsWith("/config/integrations")
        ? html`<ha-list-item-button @click=${this._manageDiscovered}>
            <span slot="headline"
              >${this.hass.localize(
                "ui.panel.config.integrations.manage_discovered"
              )}</span
            >
            <span slot="supporting-text"
              >${this.hass.localize(
                "ui.panel.config.integrations.manage_discovered_description"
              )}</span
            >
            <ha-icon-next slot="end"></ha-icon-next>
          </ha-list-item-button>`
        : nothing}
    </ha-list-base> `;
  }

  private async _integrationPicked(ev: CustomEvent<RequestSelectedDetail>) {
    const domain = (ev.currentTarget as any).domain;

    if (
      ["cloud", "google_assistant", "alexa"].includes(domain) &&
      isComponentLoaded(this.hass.config, "cloud")
    ) {
      navigate("/config/cloud");
      return;
    }

    const integration = (ev.currentTarget as any).integration;

    if (integration.supported_by) {
      // @ts-ignore
      fireEvent(this, "supported-by", { integration });
      return;
    }

    if (integration.iot_standards) {
      // @ts-ignore
      fireEvent(this, "select-brand", {
        brand: integration.domain,
      });
      return;
    }

    if (
      (domain === this.domain &&
        (("integration_type" in this.integration! &&
          !this.integration.config_flow) ||
          (!("integration_type" in this.integration!) &&
            (!this.integration!.integrations ||
              !(domain in this.integration!.integrations))))) ||
      // config_flow being undefined means its false
      (!("integration_type" in this.integration!) &&
        !this.integration!.integrations?.[domain]?.config_flow)
    ) {
      const manifest = await fetchIntegrationManifest(this.hass, domain);
      showYamlIntegrationDialog(this, { manifest });
      return;
    }

    const root = this.getRootNode();
    showConfigFlowDialog(
      root instanceof ShadowRoot ? (root.host as HTMLElement) : this,
      {
        startFlowHandler: domain,
        navigateToResult: this.navigateToResult,
        manifest: await fetchIntegrationManifest(this.hass, domain),
      }
    );
    fireEvent(this, "close-dialog");
  }

  private async _flowInProgressPicked(ev: Event) {
    const flow: DataEntryFlowProgress = (ev.currentTarget as any).flow;
    const root = this.getRootNode();
    showConfigFlowDialog(
      root instanceof ShadowRoot ? (root.host as HTMLElement) : this,
      {
        continueFlowId: flow.flow_id,
        navigateToResult: this.navigateToResult,
        manifest: await fetchIntegrationManifest(this.hass, flow.handler),
      }
    );
    fireEvent(this, "close-dialog");
  }

  private _manageDiscovered() {
    fireEvent(this, "close-dialog");
    navigate("/config/integrations/dashboard?historyBack=1");
  }

  private _standardPicked(ev: CustomEvent<RequestSelectedDetail>) {
    const domain = (ev.currentTarget as any).domain;
    const root = this.getRootNode();
    fireEvent(this, "close-dialog");
    protocolIntegrationPicked(
      root instanceof ShadowRoot ? (root.host as HTMLElement) : this,
      this.hass,
      domain,
      { brand: this.domain }
    );
  }

  static styles = [
    haStyle,
    css`
      :host {
        display: block;
        --ha-row-item-padding-inline: var(--ha-space-6);
      }
      h3 {
        margin: var(--ha-space-2) var(--ha-space-6) 0;
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-m);
        font-weight: var(--ha-font-weight-medium);
      }
      h3:first-of-type {
        margin-top: 0;
      }
      img {
        width: 32px;
        height: 32px;
      }
      wa-divider {
        margin-top: var(--ha-space-2);
      }
      ha-icon-next {
        color: var(--ha-color-text-secondary);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-domain-integrations": HaDomainIntegrations;
  }
}
